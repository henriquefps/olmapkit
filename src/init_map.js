(function() {
    // Verifica se a biblioteca OpenLayers está carregada
    if (typeof ol !== 'undefined' && typeof ol.Map !== 'undefined') {
        
        // Segurança nos parâmetros recebidos
        const authorization = $parameters.Authorization || '';
        const wmsUrl = $parameters.WMSUrl || '';
        const layer = $parameters.Layer || '';
        const containerId = $parameters.MapContainerId || 'map';
        const tooltipId = $parameters.TooltipContainerId || 'tooltip';
        const centerLon = $parameters.CenterLongitude || 0;
        const centerLat = $parameters.CenterLatitude || 0;
        const zoom = $parameters.Zoom || 10;

        // Variáveis para camadas e flags (declaradas no início do closure)
        let noPolygonFill = $parameters.EnableNotFillPolygons; // flag para controlar preenchimento do polígono
        let hasDrawnPolygon = false; // flag para controlar desenho único
        let clusterLayer; // camada de clusters
        let polygonVectorLayer; // camada de polígonos
        let clickMarkerLayer; // camada para marcador de clique (duplo clique)
        let clickMarkerSource; // fonte dos marcadores de clique (para ser usada no handler)
        const zoomThreshold = 16; // threshold padrão para alternância de layers por zoom
        let clickTimeout = null;
        let CLICK_DELAY = 0;
        let drawPanGuard = null; // definido pelo editor de desenho: bloqueia o pan com um dedo enquanto se coloca/arrasta um ponto



        function getClickDelay() {
            return ($parameters.EnableClickMarker !== true && $parameters.EnableGoToDetails !== true) ? 0 : 500;
        }

        CLICK_DELAY = getClickDelay();

        // Verifica se os parâmetros essenciais para o WMS estão presentes.
        if (!wmsUrl || !layer) {
            console.error('WMS URL and Layer are required.');
            return;
        }

        function collapseMicroGaps(jstsGeom) {
            if (!jstsGeom || jstsGeom.isEmpty()) return jstsGeom;

            // 1 cm no sistema projetado (ajusta se necessário)
            const EPS = 0.01;

            try {
                // Cola fissuras
                let g = jstsGeom.buffer(EPS);
                g = g.buffer(-EPS);

                // Normalização final
                g = g.buffer(0);

                return g;
            } catch (e) {
                console.error('Erro ao colar fissuras:', e);
                return jstsGeom.buffer(0);
            }
        }

        function closePolygonRings(olGeom) {
            if (!olGeom) return;

            const type = olGeom.getType();

            if (type === 'Polygon') {
                const rings = olGeom.getCoordinates();
                rings.forEach(ring => {
                    if (ring.length < 3) return;
                    const f = ring[0];
                    const l = ring[ring.length - 1];
                    if (f[0] !== l[0] || f[1] !== l[1]) {
                        ring.push(f.slice());
                    }
                });
                olGeom.setCoordinates(rings);
            }

            if (type === 'MultiPolygon') {
                const polys = olGeom.getCoordinates();
                polys.forEach(p =>
                    p.forEach(ring => {
                        if (ring.length < 3) return;
                        const f = ring[0];
                        const l = ring[ring.length - 1];
                        if (f[0] !== l[0] || f[1] !== l[1]) {
                            ring.push(f.slice());
                        }
                    })
                );
                olGeom.setCoordinates(polys);
            }
        }

        function makeTopologySafe(jstsGeom) {
            if (!jstsGeom || jstsGeom.isEmpty()) return jstsGeom;

            try {
                const reducer = new jsts.precision.GeometryPrecisionReducer(
                    new jsts.geom.PrecisionModel(1e6)
                );
                let g = reducer.reduce(jstsGeom);
                g = g.buffer(0);
                return g;
            } catch (e) {
                console.error('Topology error:', e);
                return jstsGeom.buffer(0);
            }
        }

        function extractSemanticPolygon(geom, minArea) {
            if (!geom || geom.isEmpty()) return null;

            if (geom.getGeometryType() === 'Polygon') {
                return geom.getArea() >= minArea ? geom : null;
            }

            if (geom.getGeometryType() === 'MultiPolygon') {
                let main = null;
                let maxArea = 0;
                let validCount = 0;

                for (let i = 0; i < geom.getNumGeometries(); i++) {
                    const g = geom.getGeometryN(i);
                    const area = g.getArea();

                    if (area >= minArea) {
                        validCount++;
                        if (area > maxArea) {
                            maxArea = area;
                            main = g;
                        }
                    }
                }

                // ❌ mais de um polígono relevante → erro real
                if (validCount > 1) return null;

                // ✅ apenas um relevante → ok
                return main;
            }

            return null;
        }



        // Fonte WMS personalizada: Carrega os tiles com autenticação básica e limpa os objetos após uso.
        const wmsSource = new ol.source.TileWMS({
            url: wmsUrl,
            params: { 'LAYERS': layer, 'TILED': true },
            serverType: 'geoserver',
            crossOrigin: 'anonymous',
            tileLoadFunction: function(imageTile, src) {
                fetch(src, {
                    headers: { 'Authorization': authorization }
                })
                .then(response => response.blob())
                .then(blob => {
                    const objectUrl = URL.createObjectURL(blob);
                    imageTile.getImage().src = objectUrl;
                    // Clean up object URL after image loads
                    imageTile.getImage().onload = function() { URL.revokeObjectURL(objectUrl); };
                })
                .catch(function(error) {
                    console.error('Erro ao carregar tile WMS:', error);
                });
            }
        });

        /******* Camadas base e WMS *******/
        const baseMap = new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: $parameters.ArcGIS_Url,
                attributions: $parameters.ArcGIS_Attributions
            })
        });

        const wmsLayer = new ol.layer.Tile({ source: wmsSource });

        /******* Criação de marcadores e camada cluster a partir dos dados *******/
        const data = JSON.parse($parameters.Markers || '[]');

        // Flatten porque cada item tem um array em Latitude
        const features = data.flatMap(function(item) {
        if (!Array.isArray(item.Coordinate)) return [];
                return item.Coordinate.map(function(m) {

                    // Skip markers with missing coordinates only (allow zero as valid coordinate)
                    if (m.Latitude == null || m.Longitude == null) {
                        console.warn('Marcador ignorado: coordenadas null/undefined', m);
                        return null;
                    }

                    var feature = new ol.Feature({
                        geometry: new ol.geom.Point(ol.proj.fromLonLat([m.Longitude, m.Latitude]))
                    });

                    // Mapeia propriedades de tooltip diretamente do JSON
                    feature.set('MarkerId', m.MarkerId || '');
                    feature.set('IsShowTooltip', m.IsShowTooltip === true);
                    feature.set('TooltipTitle', m.TooltipTitle || '');
                    feature.set('TooltipIsShowDescription', m.TooltipIsShowDescription === true);
                    feature.set('TooltipDescription', m.TooltipDescription || '');
                    feature.set('TooltipDetailList', m.TooltipDetailList || []);
                    return feature;
                });
        }).filter(function(feature) { 
            // Remove os null do array
            return feature !== null; 
        });

        // Agrupamento (cluster) dos marcadores
        var vectorSource = new ol.source.Vector({ features: features });
        var clusterSource = new ol.source.Cluster({
            distance: 40,
            source: vectorSource
        });

        // Estilo dos clusters
        var clusterStyle = function(feature) {
            var feats = feature.get('features');
            var size = feats.length;
            if ($parameters.EnableClickMarker !== true) {
                if (size === 1) {
                    // Recupera a feature original dentro do cluster
                    var originalFeature = feats[0];
                    return new ol.style.Style({
                        image: new ol.style.Icon({
                            src: '/DF_Res/img/DF_Res.PinMapSimple.svg', // ícone simples
                            anchor: [0.5, 1],
                            anchorXUnits: 'fraction',
                            anchorYUnits: 'fraction',
                            scale: 1
                        })
                    });
                } else {
                    // Cluster com mais de 1 ponto
                    return new ol.style.Style({
                        image: new ol.style.Icon({
                            src: '/DF_Res/img/DF_Res.PinMapGroup.svg',
                            scale: 1
                        }),
                        text: new ol.style.Text({
                            text: size.toString(),
                            font: 'bold 14px Arial',
                            fill: new ol.style.Fill({ color: '#fff' }),
                            offsetY: -7,
                            offsetX: -7
                        })
                    });
                }
            } else {
                if (size === 1) {
                    return new ol.style.Style({
                        image: new ol.style.Icon({
                            src: '/DF_Res/img/DF_Res.PinMapDisabled.svg', // pin desabilitado
                            anchor: [0.5, 1],
                            anchorXUnits: 'fraction',
                            anchorYUnits: 'fraction',
                            scale: 1
                        })
                    });
                } else {
                    return new ol.style.Style({
                        image: new ol.style.Icon({
                            src: '/DF_Res/img/DF_Res.PinMapGroupDisabled.svg',
                            scale: 1
                        }),
                        text: new ol.style.Text({
                            text: size.toString(),
                            font: 'bold 14px Arial',
                            fill: new ol.style.Fill({ color: '#fff' }),
                            offsetY: -7,
                            offsetX: -7
                        })
                    });
                }
            }
        };

        clusterLayer = new ol.layer.Vector({
            source: clusterSource,
            style: clusterStyle
        });

        /******* FIM - Criação de marcadores e camada cluster a partir dos dados *******/

        /******* Configuração do mapa *******/
        // Cria as interações básicas
        var interactions = [
            new ol.interaction.DragPan({
                condition: function (mapBrowserEvent) {
                    return ol.events.condition.noModifierKeys(mapBrowserEvent) &&
                        ol.events.condition.primaryAction(mapBrowserEvent) &&
                        (!drawPanGuard || drawPanGuard(mapBrowserEvent));
                }
            }),
            new ol.interaction.PinchZoom(),            
            new ol.interaction.MouseWheelZoom({
                condition: function (mapBrowserEvent) {
                    return mapBrowserEvent.originalEvent.ctrlKey; // Só permite zoom com Ctrl pressionado
                }
            }),
            new ol.interaction.DragRotateAndZoom(),
            new ol.interaction.KeyboardPan(),
            new ol.interaction.KeyboardZoom()
        ];

        // Remove double click zoom se EnableClickMarker estiver true
        if ($parameters.EnableClickMarker !== true && $parameters.EnableGoToDetails !== true) {
            interactions.push(new ol.interaction.DoubleClickZoom());
        }

        // Options do mapa (sem adicionar camadas além da base e WMS — camadas principais adicionadas no fim)
        var options = {
            target: containerId,
            layers: [baseMap, wmsLayer],
            controls: [
                new ol.control.FullScreen(),
                new ol.control.Zoom()
            ],
            view: new ol.View({
                center: ol.proj.fromLonLat([centerLon, centerLat]),
                zoom: zoom,
                maxZoom: 19
            }),
            interactions: interactions // Eventos/interações no mapa
        };
        /******* FIM -  Configuração do mapa *******/

        /******* Inicialização do mapa *******/
        var olMap = new ol.Map(options);
        /******* FIM - Inicialização do mapa *******/

        /******* Evento de Clique no cluster *******/
        olMap.on('click', function(evt) {
             clickTimeout = setTimeout(() => {
                    var feature = olMap.forEachFeatureAtPixel(evt.pixel, function(feature) {
                    return feature;
                });

                if (feature && feature.get('features')) {
                    var clusterFeatures = feature.get('features');
                    var clusterSize = clusterFeatures.length;

                    if (clusterSize > 0) {
                        // Centraliza no ponto do cluster
                        var clusterCoord = feature.getGeometry().getCoordinates();

                        // Força zoom no threshold definido (ex.: 16)
                        var view = olMap.getView();
                        var targetZoom = 16; // <-- teu threshold
                        view.animate({
                            center: clusterCoord,
                            zoom: targetZoom,
                            duration: 800 // animação suave
                        });
                    }
                }
            }, CLICK_DELAY);
        });
        /******* FIM - Evento de Clique no cluster *******/

        /******* Polígonos *******/
        function orderCoordinates(coords) {
            // Calcula o centróide do conjunto de pontos
            var centroid = coords.reduce(function(acc, pt) {
                return [acc[0] + pt[0], acc[1] + pt[1]];
            }, [0, 0]).map(function(val) { return val / coords.length; });

            // Ordena pelo ângulo em relação ao centróide
            return coords.sort(function(a, b) {
                var angleA = Math.atan2(a[1] - centroid[1], a[0] - centroid[0]);
                var angleB = Math.atan2(b[1] - centroid[1], b[0] - centroid[0]);
                return angleA - angleB;
            });
        }

        function unwrapSingleArray(obj) {
            if (Array.isArray(obj)) {
                return obj.map(unwrapSingleArray);
            }
            if (obj && typeof obj === 'object' && '__singleArrayAttribute' in obj) {
                return unwrapSingleArray(obj.__singleArrayAttribute);
            }
            return obj;
        }

        // Converte JSON e desembrulha os atributos
        var rawJson = JSON.parse($parameters.MultiPolygons || '{}');
        // Aceita { polygons: [...] } ou { parcelas: [...] } (nome original da estrutura)
        var parcelas = unwrapSingleArray(rawJson.polygons || rawJson.parcelas || []);
        // Cria as features dos polígonos
        var polygonFeatures = [];

        parcelas.forEach(function(parcela) {
            var id = parcela.PolygonId;
            var coordObjs = unwrapSingleArray(parcela.Coordinates);

            if (!coordObjs || coordObjs.length < 3) {
                return;
            }

            // Converte de objetos {Lon, Lat} para array [lon, lat]
            var coordArray = coordObjs.map(function(pt) {
                return ol.proj.fromLonLat([pt.Lon, pt.Lat]);
            });

            if ($parameters.EnableOrderPolygonsByCentroid) {
                // Ordena para garantir sentido anti-horário
                coordArray = orderCoordinates(coordArray);
            } else {
                coordArray = coordArray;
            }

            var polygon = new ol.geom.Polygon([coordArray]);

            var feature = new ol.Feature({
                geometry: polygon,
                name: id
            });

            // Propriedades gerais do polígono
            feature.set('PolygonId', parcela.PolygonId || '');
            feature.set('BorderColor', parcela.BorderColor);
            feature.set('BackgroundColor', parcela.BackgroundColor);
            feature.set('CanDrawInsideIt', parcela.CanDrawInsideIt || false);
            feature.set('PolygonName', parcela.PolygonName || '');

            // Propriedades de tooltip
            feature.set('IsShowTooltip', parcela.IsShowTooltip === true);
            feature.set('TooltipTitle', parcela.TooltipTitle || '');
            feature.set('TooltipIsShowDescription', parcela.TooltipIsShowDescription === true);
            feature.set('TooltipDescription', parcela.TooltipDescription || '');
            feature.set('TooltipDetailList', parcela.TooltipDetailList || []);

            polygonFeatures.push(feature);
        });

        // Estilo baseado em BorderColor / BackgroundColor / PolygonName
        function styleFunction(feature) {
            var borderColor = feature.get('BorderColor');
            var backgroundColor = feature.get('BackgroundColor');
            var polygonName = feature.get('PolygonName');
            var strokeColor, fillColor;

            strokeColor = borderColor;
            fillColor = backgroundColor;

            var styleConfig = {
                stroke: new ol.style.Stroke({
                    color: strokeColor,
                    width: 2
                })
            };

            if (!noPolygonFill) {
                styleConfig.fill = new ol.style.Fill({
                    color: fillColor
                });
            }

            // Cria o estilo base do polígono
            var style = new ol.style.Style(styleConfig);

            // Adiciona o texto somente se PolygonName estiver preenchido
            if (polygonName && polygonName.trim() !== '') {
                style.setText(
                    new ol.style.Text({
                        text: polygonName,
                        font: 'bold 13px "Open Sans", sans-serif',
                        fill: new ol.style.Fill({ color: '#ffffff' }),
                        stroke: new ol.style.Stroke({ color: '#000000', width: 3 }),
                        overflow: true,
                        placement: 'point',
                        geometry: function (feature) {
                            return feature.getGeometry().getInteriorPoint();
                        }
                    })
                );
            }

            return style;
        }


        // Camada vetorial para polígonos (não adicionada ao mapa ainda)
        var polygonVectorSource = new ol.source.Vector({
            features: polygonFeatures
        });

        polygonVectorLayer = new ol.layer.Vector({
            source: polygonVectorSource,
            style: styleFunction
        });
        /******* FIM - Polígonos *******/

        /******* Fazer zoom automático para mostrar todos os polígonos ou marcadores *******/
        // ----- Zoom automático dos marcadores -----
        if (features.length > 0) {
            var extent = vectorSource.getExtent();
            var minX = extent[0], minY = extent[1], maxX = extent[2], maxY = extent[3];
            var width = maxX - minX;
            var height = maxY - minY;
            var buffer = 0.0005; // evita zoom exagerado quando todos os pontos estão sobrepostos

            var adjustedExtent = extent;
            if (width < buffer || height < buffer) {
                adjustedExtent = [
                    minX - buffer,
                    minY - buffer,
                    maxX + buffer,
                    maxY + buffer
                ];
            }

            olMap.getView().fit(adjustedExtent, {
                size: olMap.getSize(),
                padding: [50, 50, 50, 50],
                maxZoom: 17
            });
        }

        // ----- Zoom automático dos polígonos -----
        if (polygonFeatures.length > 0) {
            var polyExtent = polygonVectorSource.getExtent();
            olMap.getView().fit(polyExtent, {
                size: olMap.getSize(),
                padding: [50, 50, 50, 50]
            });
        }
        /******* FIM - Fazer zoom automático para mostrar todos os polígonos ou marcadores *******/

        /******* Evento de duplo clique (marcador por duplo clique) *******/
        if ($parameters.EnableClickMarker === true) {
            clickMarkerSource = new ol.source.Vector();
            // Camada com marcador clicado (não adicionada ainda)
            clickMarkerLayer = new ol.layer.Vector({
                source: clickMarkerSource,
                style: new ol.style.Style({
                    image: new ol.style.Icon({
                        src: '/DF_Res/img/DF_Res.PinMapSimple.svg', // marcador do duplo clique
                        anchor: [0.5, 1],
                        anchorXUnits: 'fraction',
                        anchorYUnits: 'fraction',
                        scale: 1
                    })
                })
            });

            // Evento de duplo clique
            olMap.on('dblclick', function(evt) {
                var coordinate = evt.coordinate;

                // Verifica se o ponto está dentro de algum polígono
                var polygonFeature = polygonVectorSource.getFeatures().find(function(polygon) {
                    return polygon.getGeometry().intersectsCoordinate(coordinate);
                });

                var canClickOutPolygon = $parameters.EnableMarkerOutPolygon || false;

                if (!polygonFeature && !canClickOutPolygon) {
                    // Se não estiver dentro de um polígono, ignora
                    return;
                }

                // Remove marcador anterior
                clickMarkerSource.clear();

                // Cria novo marcador do duplo clique
                var markerFeature = new ol.Feature({
                    geometry: new ol.geom.Point(coordinate)
                });
                clickMarkerSource.addFeature(markerFeature);

                // Chama a action do OutSystems
                var lonLat = ol.proj.toLonLat(coordinate);
                $actions.OnClickSetMarker(lonLat[1], lonLat[0]); // latitude, longitude
            });
        }
        /******* FIM - Evento de duplo clique *******/

        /******* Controle de visualização inicial entre clusters e polígonos *******/
        function updateLayerVisibility() {
            // Se EnableClickMarker estiver true, clusters ficam sempre visíveis
            if ($parameters.EnableClickMarker === true || $parameters.EnableAlwaysShowPolygon === true) {
                clusterLayer.setVisible(true);
                polygonVectorLayer.setVisible(true); // mantém polígonos visíveis também
                return;
            }

           // No caso de ter apenas markers e não tiver polígonos, não se aplica a alternância
            var polygons = JSON.parse($parameters.MultiPolygons || '{}');
            var polygonList = polygons.polygons || polygons.parcelas;
            if ((!polygonList || polygonList.length === 0) ) {
                clusterLayer.setVisible(true);
                return;
            }

            var currentZoom = olMap.getView().getZoom();
            if (currentZoom >= zoomThreshold ) {
                clusterLayer.setVisible(false);
                polygonVectorLayer.setVisible(true);
            } else {
                clusterLayer.setVisible(true);
                polygonVectorLayer.setVisible(false);
            }
        }

        // Aplica imediatamente no carregamento
        updateLayerVisibility();

        // Também aplica sempre que o zoom mudar
        olMap.getView().on('change:resolution', updateLayerVisibility);
        /******* FIM - Controle de visualização inicial entre clusters e polígonos *******/

        /******* ToolTip *******/
        var tooltip = document.getElementById(tooltipId);

        if (tooltip) {
            olMap.on('pointermove', function(evt) {
                var feature = null;
                var clusterFeatures = null;

                // ----- POSICIONAMENTO COM ANCORAGEM PRECISA -----
                function getVerticalOffset(feature, clusterFeatures) {
                    // Define offset conforme o tipo/tamanho do ícone
                    if (clusterFeatures && clusterFeatures.length > 1) {
                        return 40; // cluster grande
                    }

                    var props = feature && feature.getProperties ? feature.getProperties() : {};
                    var iconSize = props.IconSize ? props.IconSize : 'normal'; // caso tenhas essa info nos props

                    switch (iconSize) {
                        case 'small': return 28; // ícone 44x44
                        case 'normal': return 36; // ícone 52x60
                        case 'large': return 38; // ícone 65x60
                        default: return 36; // fallback
                    }
                }

                // Verifica se é cluster
                olMap.forEachFeatureAtPixel(evt.pixel, function(f) {
                    var feats = f.get('features');
                    if (feats && feats.length > 0) {
                        clusterFeatures = feats;
                    } else {
                        feature = f;
                    }
                    return true;
                });

                // Se não tem nada, esconde tooltip
                if (!feature && !clusterFeatures) {
                    tooltip.style.display = 'none';
                    return;
                }

                // Cluster com mais de 1 feature
                if (clusterFeatures && clusterFeatures.length > 1) {
                    tooltip.innerHTML = '<div class="tooltip-title"><p>' + clusterFeatures.length + ' ' + $parameters.ClusterText + '</p></div>';

                    // Calcula a posição do cluster (centro das features)
                    var clusterFeature = clusterFeatures[0];
                    var coord = clusterFeature.getGeometry().getCoordinates();
                    if (clusterFeature.getGeometry().getType() === 'Polygon') {
                        coord = ol.extent.getCenter(clusterFeature.getGeometry().getExtent());
                    }

                    // Converte coordenadas para pixel relativo ao mapa
                    var pixel = olMap.getPixelFromCoordinate(coord);
                    var tooltipRect = tooltip.getBoundingClientRect();
                    var mapSize = olMap.getSize();
                    var margin = 10;
                    var verticalOffset = getVerticalOffset(null, clusterFeatures);
                    var top, left;

                    // Posição padrão: acima do ponto + offset
                    top = pixel[1] - tooltipRect.height - margin - verticalOffset;
                    left = pixel[0] - tooltipRect.width / 2;

                    // Se não couber acima, move para baixo
                    if (top < 0) {
                        top = pixel[1] + margin + verticalOffset;
                        tooltip.classList.add('bottom');
                    } else {
                        tooltip.classList.remove('bottom');
                    }

                    // Limites laterais
                    if (left < margin) left = margin;
                    if (left + tooltipRect.width > mapSize[0] - margin)
                        left = mapSize[0] - tooltipRect.width - margin;

                    tooltip.style.left = left + 'px';
                    tooltip.style.top = top + 'px';
                    tooltip.style.display = 'block';
                    return;
                }

                // Cluster com 1 feature → trata como feature única
                if (clusterFeatures && clusterFeatures.length === 1) {
                    feature = clusterFeatures[0];
                }

                // Já temos uma feature válida (marcador ou polígono)
                var props = feature.getProperties();
                if (!props || !props.IsShowTooltip) {
                    tooltip.style.display = 'none';
                    return;
                }

                // Monta o HTML do tooltip dinâmico
                var html = '';

                // 1️⃣ Título
                html += '<div class="tooltip-title"><p>' + (props.TooltipTitle || '') + '</p></div>';
                html += '<div class="tooltip-separator"></div>'; // Linha separadora abaixo do título

                // 2️⃣ Lista de detalhes (TooltipDetailList)
                if (props.TooltipDetailList && Array.isArray(props.TooltipDetailList)) {
                    html += '<div class="tooltip-detail-list">';
                    props.TooltipDetailList.forEach(function(detail) {
                        if (detail.IsSubtitle) {
                            html +=
                                '<div class="tooltip-separator"></div>' +
                                '<div class="tooltip-detail-item tooltip-subtitle">' +
                                '<p class="tooltip-detail-label">' + (detail.Label || '') + '</p>' +
                                '<p class="tooltip-detail-value">' + (detail.Value || '') + '</p>' +
                                '</div>';
                        } else {
                            html +=
                                '<div class="tooltip-detail-item">' +
                                '<p class="tooltip-detail-label">' + (detail.Label || '') + '</p>' +
                                '<p class="tooltip-detail-value">' + (detail.Value || '') + '</p>' +
                                '</div>';
                        }
                    });
                    html += '</div>';
                }

                tooltip.innerHTML = html;

                // ----- POSICIONAMENTO COM ANCORAGEM PRECISA -----
                // Obtém coordenadas do centro (marcador ou polígono)
                var coord = feature.getGeometry().getCoordinates();
                if (feature.getGeometry().getType() === 'Polygon') {
                    coord = ol.extent.getCenter(feature.getGeometry().getExtent());
                }

                var pixel = olMap.getPixelFromCoordinate(coord);
                var tooltipRect = tooltip.getBoundingClientRect();
                var mapSize = olMap.getSize();
                var margin = 10;
                var verticalOffset = getVerticalOffset(feature, clusterFeatures);
                var top, left;

                top = pixel[1] - tooltipRect.height - margin - verticalOffset;
                left = pixel[0] - tooltipRect.width / 2;

                if (top < 0) {
                    top = pixel[1] + margin + verticalOffset;
                    tooltip.classList.add('bottom');
                } else {
                    tooltip.classList.remove('bottom');
                }

                if (left < margin) left = margin;
                if (left + tooltipRect.width > mapSize[0] - margin)
                    left = mapSize[0] - tooltipRect.width - margin;

                tooltip.style.left = left + 'px';
                tooltip.style.top = top + 'px';
                tooltip.style.display = 'block';
            });
        } else {
            console.warn('Nenhum elemento de tooltip encontrado no DOM.');
        }
        /******* FIM - ToolTip *******/

        /****** Polygon and Marker Double click - Go To Details event ******/
        if ($parameters.EnableGoToDetails === true) {
            
            olMap.on('dblclick', function(evt) {
                // cancela o click pendente
                
                if (clickTimeout) {
                    clearTimeout(clickTimeout);
                    clickTimeout = null;
                }

                evt.preventDefault(); // importante no OpenLayers

                var feature = olMap.forEachFeatureAtPixel(evt.pixel, function(f) { return f; });

                if (!feature) return;

                // Extrai os IDs, dependendo se é polígono ou marcador
                var featureId = feature.get('PolygonId') || feature.values_.features[0].get('MarkerId');
                var isSubParcel = feature.get('IsSubParcel') === true;
                var isCulture = feature.get('IsCulture') === true;
                var isParcel = feature.get('IsCulture') !== true && feature.get('IsSubParcel') !== true;

                // Verifica se a ação existe no OutSystems antes de chamar
                if (typeof $actions.OnClickGoToDetail === 'function') {
                    $actions.OnClickGoToDetail(featureId, isParcel, isSubParcel, isCulture);
                }
            });
        }
        /****** FIM - Polygon and Marker Double click - Go To Details event ******/

        /******* Adiciona camadas ao mapa no fim (ordem controlada) *******/
        // Ordem: base, WMS, polígonos, clusters (por cima dos polígonos), desenho, marcador de clique
        // baseMap e wmsLayer já adicionadas na criação do mapa; adicionamos o resto agora
        if (polygonVectorLayer) {
            polygonVectorLayer.set('name', 'polygonVectorLayer'); // 🔹 Identificação
            olMap.addLayer(polygonVectorLayer);
            }
        if (clickMarkerLayer) {
            clickMarkerLayer.set('name', 'clickMarkerLayer'); // 🔹 Identificação
            olMap.addLayer(clickMarkerLayer);
        }
        if (clusterLayer) {
            clusterLayer.set('name', 'clusterLayer'); // 🔹 Identificação
            olMap.addLayer(clusterLayer);
        }
        /******* FIM - Adiciona camadas  *******/
        
        /****** Desenhar polígono ******/

        
        if ($parameters.EnableDrawPolygon) {

            /**************************************
             * TEXTOS (traduzir aqui, ou passar $parameters.DrawLabels em JSON)
             **************************************/
            let customLabels = {};
            try { customLabels = JSON.parse($parameters.DrawLabels || '{}') || {}; } catch (e) { customLabels = {}; }
            const LABELS = Object.assign({
                locale: 'pt-PT',
                usefulArea: 'Área útil',
                hintDrawTouch: 'Toque no mapa para adicionar pontos. Arraste um ponto ou um + para ajustar. Use dois dedos para mover o mapa.',
                hintDrawMouse: 'Clique para adicionar pontos. Arraste um ponto ou um + para ajustar. Duplo clique para terminar.',
                hintEdit: 'Arraste os pontos ou os + para ajustar. Toque num ponto para o selecionar e remover.',
                undo: 'Desfazer',
                clear: 'Limpar',
                finish: 'Terminar',
                resume: 'Adicionar pontos',
                removePoint: 'Remover ponto',
                redraw: 'Redesenhar',
                minPoints: 'São necessários pelo menos 3 pontos.',
                selfIntersect: 'As linhas do polígono cruzam-se. Ajuste os pontos.',
                multi: $parameters.DrawTwoPolygonsAlertMessage || 'O desenho gera várias áreas separadas. Ajuste os pontos.',
                empty: $parameters.DrawOutOfPolygonAlertMessage || 'O desenho está fora da área disponível.',
                noBase: 'Não foi possível identificar a área onde desenhar.'
            }, customLabels);

            /**************************************
             * ESTILOS DO EDITOR (injetados uma vez)
             **************************************/
            if (!document.getElementById('olx-draw-style')) {
                const css = document.createElement('style');
                css.id = 'olx-draw-style';
                css.textContent =
                    '.olx-hud{position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:5;display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;max-width:calc(100% - 96px);font-family:"Open Sans",sans-serif}' +
                    '.olx-area{background:rgba(0,0,0,.72);color:#fff;border-radius:16px;padding:6px 14px;font-size:14px;white-space:nowrap}' +
                    '.olx-area b{font-weight:700}' +
                    '.olx-msg{background:#fff3cd;color:#664d03;border:1px solid #ffe69c;border-radius:8px;padding:6px 10px;font-size:13px;text-align:center}' +
                    '.olx-msg.olx-error{background:#f8d7da;color:#842029;border-color:#f1aeb5}' +
                    '.olx-msg:empty{display:none}' +
                    '.olx-bar{position:absolute;left:8px;right:8px;bottom:8px;z-index:5;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none;font-family:"Open Sans",sans-serif}' +
                    '.olx-hint{background:rgba(255,255,255,.92);color:#1d2330;border-radius:8px;padding:6px 10px;font-size:12px;text-align:center;max-width:520px;box-shadow:0 1px 4px rgba(0,0,0,.25)}' +
                    '.olx-buttons{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;pointer-events:auto}' +
                    '.olx-buttons button{min-height:44px;min-width:44px;padding:0 16px;border-radius:22px;border:0;font:600 14px "Open Sans",sans-serif;background:#fff;color:#1d2330;box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer;touch-action:manipulation}' +
                    '.olx-buttons button.olx-primary{background:#2e7d32;color:#fff}' +
                    '.olx-buttons button.olx-danger{background:#c62828;color:#fff}' +
                    '.olx-buttons button:disabled{opacity:.45;cursor:default}' +
                    '.olx-buttons button[hidden]{display:none}';
                document.head.appendChild(css);
            }

            /**************************************
             * JSTS
             **************************************/
            const jstsParser = new jsts.io.OL3Parser();
            jstsParser.inject(
                ol.geom.Point,
                ol.geom.LineString,
                ol.geom.LinearRing,
                ol.geom.Polygon,
                ol.geom.MultiPoint,
                ol.geom.MultiLineString,
                ol.geom.MultiPolygon
            );

            function toJsts(olGeom) {
                const g = olGeom.clone();
                closePolygonRings(g);
                return makeTopologySafe(jstsParser.read(g));
            }

            function openRing(olPolygon) {
                const ring = olPolygon.getCoordinates()[0].map(c => c.slice());
                const f = ring[0];
                const l = ring[ring.length - 1];
                if (ring.length > 1 && f[0] === l[0] && f[1] === l[1]) ring.pop();
                return ring;
            }

            /**************************************
             * ÁREA BASE, ÁREAS PROIBIDAS E POLÍGONO EDITÁVEL
             * - base: polígono CanDrawInsideIt = true (o maior, se houver vários)
             * - editável: $parameters.EditablePolygonId, ou um CanDrawInsideIt = true
             *   contido na base (é assim que o ecrã envia um polígono já desenhado)
             **************************************/
            const candidates = polygonVectorSource.getFeatures()
                .filter(p => p.get('CanDrawInsideIt') === true)
                .sort((a, b) => b.getGeometry().getArea() - a.getGeometry().getArea());

            let editableFeature = null;
            if ($parameters.EditablePolygonId) {
                editableFeature = candidates.find(p => p.get('PolygonId') === $parameters.EditablePolygonId) || null;
            }

            let bases = candidates.filter(p => p !== editableFeature);
            if (!editableFeature && bases.length >= 2) {
                const outer = toJsts(bases[0].getGeometry()).buffer(0.5);
                editableFeature = bases.slice(1).find(p => outer.contains(toJsts(p.getGeometry()))) || null;
                bases = bases.filter(p => p !== editableFeature);
            }

            let freeArea = null;
            if (bases.length === 1) {
                freeArea = toJsts(bases[0].getGeometry());
                polygonVectorSource.getFeatures()
                    .filter(p => p.get('CanDrawInsideIt') === false)
                    .forEach(p => {
                        freeArea = makeTopologySafe(freeArea.difference(toJsts(p.getGeometry())));
                    });
                if (freeArea.isEmpty()) freeArea = null;
            }

            /**************************************
             * ESTADO
             **************************************/
            const state = {
                mode: 'drawing',      // 'drawing' | 'editing'
                ring: [],             // vértices (EPSG:3857), sem ponto de fecho
                cursor: null,         // posição do rato durante o desenho
                placing: null,        // posição do dedo enquanto coloca um ponto
                dragIndex: -1,
                dragOrigin: null,
                dragMoved: false,
                inserted: false,
                cancelled: false,
                selected: -1,
                touch: false,
                result: null,
                lastEmitted: '|-1',   // o ecrã começa sem desenho válido
                suppressClick: false
            };

            if (editableFeature) {
                state.ring = openRing(editableFeature.getGeometry());
                state.mode = state.ring.length >= 3 ? 'editing' : 'drawing';
                polygonVectorSource.removeFeature(editableFeature);
            }

            /**************************************
             * CÁLCULO DA ÁREA ÚTIL
             **************************************/
            function computeUseful(ring) {
                if (ring.length < 3) return { status: 'incomplete' };
                if (!freeArea) return { status: 'nobase' };

                const userGeom = jstsParser.read(new ol.geom.Polygon([ring.concat([ring[0]])]));
                if (!userGeom.isValid()) return { status: 'selfintersect' };

                let clipped = makeTopologySafe(makeTopologySafe(userGeom).intersection(freeArea));
                if (!clipped || clipped.isEmpty()) return { status: 'empty' };

                const pieces = [];
                for (let i = 0; i < clipped.getNumGeometries(); i++) {
                    const g = clipped.getGeometryN(i);
                    if (g.getGeometryType() === 'Polygon') pieces.push(g);
                }
                if (pieces.length === 0) return { status: 'empty' };

                pieces.sort((a, b) => b.getArea() - a.getArea());
                const minArea = Math.max(0.5, pieces[0].getArea() * 0.005);
                const significant = pieces.filter(g => g.getArea() >= minArea);

                if (significant.length > 1) {
                    return { status: 'multi', geom: jstsParser.write(clipped) };
                }

                // Remove vértices quase colineares criados pelo recorte (5 cm)
                let main = significant[0];
                const simplified = jsts.simplify.TopologyPreservingSimplifier.simplify(main, 0.05);
                if (simplified && !simplified.isEmpty() && simplified.getGeometryType() === 'Polygon') {
                    main = simplified;
                }

                const olGeom = jstsParser.write(main);
                closePolygonRings(olGeom);
                return { status: 'ok', geom: olGeom, area: ol.sphere.getArea(olGeom) };
            }

            function resultKey(r) {
                return r && r.status === 'ok' ? r.area + '|' + r.geom.getCoordinates()[0].join(';') : '|-1';
            }

            function emitResult() {
                const r = computeUseful(state.ring);
                let json = '';
                let areaHa = -1;

                if (r && r.status === 'ok') {
                    json = JSON.stringify(r.geom.getCoordinates()[0].map((c, i) => {
                        const ll = ol.proj.toLonLat(c);
                        return { Order: i + 1, Longitude: ll[0], Latitude: ll[1] };
                    }));
                    areaHa = r.area / 10000;
                }

                const key = resultKey(r);
                if (key === state.lastEmitted) return;
                state.lastEmitted = key;
                $actions.OnDrawCoordinates(json, areaHa);
            }

            /**************************************
             * CAMADA E ESTILOS
             **************************************/
            const shapeFeature = new ol.Feature();
            const usefulFeature = new ol.Feature();
            const vertexFeature = new ol.Feature();
            const midpointFeature = new ol.Feature();
            const placingFeature = new ol.Feature();

            const editSource = new ol.source.Vector({
                features: [usefulFeature, shapeFeature, midpointFeature, vertexFeature, placingFeature]
            });

            function sizes() {
                return state.touch
                    ? { vertex: 11, midpoint: 9, hit: 26, finishLast: 14, midMinPx: 60 }
                    : { vertex: 6, midpoint: 5, hit: 10, finishLast: 6, midMinPx: 30 };
            }

            function formatArea(m2) {
                const ha = m2 / 10000;
                return ha.toLocaleString(LABELS.locale, { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + ' ha';
            }

            function midpoints(resolution) {
                const ring = state.ring;
                const out = [];
                if (ring.length < 2) return out;
                const count = state.mode === 'editing' && ring.length >= 3 ? ring.length : ring.length - 1;
                const minLen = sizes().midMinPx * resolution;
                for (let i = 0; i < count; i++) {
                    const a = ring[i];
                    const b = ring[(i + 1) % ring.length];
                    if (Math.hypot(b[0] - a[0], b[1] - a[1]) >= minLen) {
                        out.push({ index: i, coord: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] });
                    }
                }
                return out;
            }

            function editStyle(feature, resolution) {
                const s = sizes();

                if (feature === usefulFeature) {
                    const r = state.result;
                    if (!r || !r.geom) return null;
                    const ok = r.status === 'ok';
                    return new ol.style.Style({
                        stroke: new ol.style.Stroke({ color: ok ? 'rgba(100,255,0,1)' : 'rgba(229,57,53,1)', width: 2 }),
                        fill: new ol.style.Fill({ color: ok ? 'rgba(100,255,0,0.35)' : 'rgba(229,57,53,0.35)' }),
                        text: ok ? new ol.style.Text({
                            text: formatArea(r.area),
                            font: 'bold 13px "Open Sans", sans-serif',
                            fill: new ol.style.Fill({ color: '#fff' }),
                            backgroundFill: new ol.style.Fill({ color: 'rgba(0,0,0,0.6)' }),
                            padding: [2, 6, 2, 6],
                            offsetY: -22,
                            overflow: true
                        }) : undefined
                    });
                }

                if (feature === shapeFeature) {
                    if (!feature.getGeometry()) return null;
                    return new ol.style.Style({
                        stroke: new ol.style.Stroke({ color: '#ffffff', width: 2, lineDash: [6, 6] })
                    });
                }

                if (feature === midpointFeature) {
                    const mids = midpoints(resolution);
                    if (!mids.length) return null;
                    return new ol.style.Style({
                        geometry: new ol.geom.MultiPoint(mids.map(m => m.coord)),
                        image: new ol.style.Circle({
                            radius: s.midpoint,
                            fill: new ol.style.Fill({ color: 'rgba(255,255,255,0.75)' }),
                            stroke: new ol.style.Stroke({ color: 'rgba(46,125,50,0.9)', width: 2 })
                        }),
                        text: new ol.style.Text({
                            text: '+',
                            font: 'bold ' + (s.midpoint * 2) + 'px sans-serif',
                            fill: new ol.style.Fill({ color: '#2e7d32' }),
                            offsetY: 1
                        })
                    });
                }

                if (feature === vertexFeature) {
                    const ring = state.ring;
                    if (!ring.length) return null;
                    const styles = [new ol.style.Style({
                        geometry: new ol.geom.MultiPoint(ring),
                        image: new ol.style.Circle({
                            radius: s.vertex,
                            fill: new ol.style.Fill({ color: '#ffffff' }),
                            stroke: new ol.style.Stroke({ color: '#2e7d32', width: 3 })
                        })
                    })];
                    // Primeiro ponto destacado: tocar nele fecha o polígono
                    if (state.mode === 'drawing' && ring.length >= 3) {
                        styles.push(new ol.style.Style({
                            geometry: new ol.geom.Point(ring[0]),
                            image: new ol.style.Circle({
                                radius: s.vertex + 3,
                                fill: new ol.style.Fill({ color: '#2e7d32' }),
                                stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 })
                            })
                        }));
                    }
                    if (state.selected >= 0 && ring[state.selected]) {
                        styles.push(new ol.style.Style({
                            geometry: new ol.geom.Point(ring[state.selected]),
                            image: new ol.style.Circle({
                                radius: s.vertex + 3,
                                fill: new ol.style.Fill({ color: '#c62828' }),
                                stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 })
                            })
                        }));
                    }
                    return styles;
                }

                if (feature === placingFeature) {
                    if (!feature.getGeometry()) return null;
                    return new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: s.vertex + 8,
                            fill: new ol.style.Fill({ color: 'rgba(46,125,50,0.25)' }),
                            stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
                        })
                    });
                }
                return null;
            }

            const editLayer = new ol.layer.Vector({
                source: editSource,
                style: editStyle,
                updateWhileAnimating: true,
                updateWhileInteracting: true
            });
            editLayer.set('name', 'drawEditLayer');
            olMap.addLayer(editLayer);
            // Mantém o nome global usado pelo Map_ResetOpenLayersEnvironment
            window.drawVector = editLayer;

            /**************************************
             * HUD (área útil, mensagens, botões)
             **************************************/
            const target = olMap.getTargetElement();
            const hud = document.createElement('div');
            hud.className = 'olx-hud';
            hud.innerHTML = '<div class="olx-area"></div><div class="olx-msg"></div>';
            const bar = document.createElement('div');
            bar.className = 'olx-bar';
            bar.innerHTML =
                '<div class="olx-hint"></div>' +
                '<div class="olx-buttons">' +
                '<button type="button" data-a="undo"></button>' +
                '<button type="button" data-a="clear"></button>' +
                '<button type="button" data-a="finish" class="olx-primary"></button>' +
                '<button type="button" data-a="remove" class="olx-danger"></button>' +
                '<button type="button" data-a="resume" class="olx-primary"></button>' +
                '<button type="button" data-a="redraw"></button>' +
                '</div>';
            target.appendChild(hud);
            target.appendChild(bar);

            const ui = {
                area: hud.querySelector('.olx-area'),
                msg: hud.querySelector('.olx-msg'),
                hint: bar.querySelector('.olx-hint'),
                btn: {}
            };
            bar.querySelectorAll('button').forEach(b => {
                ui.btn[b.dataset.a] = b;
                b.textContent = { undo: LABELS.undo, clear: LABELS.clear, finish: LABELS.finish, remove: LABELS.removePoint, resume: LABELS.resume, redraw: LABELS.redraw }[b.dataset.a];
                b.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    actions[b.dataset.a]();
                });
            });

            let transientMsg = '';
            let transientTimer = null;
            function flash(msg) {
                transientMsg = msg;
                clearTimeout(transientTimer);
                transientTimer = setTimeout(() => { transientMsg = ''; renderHud(); }, 3000);
                renderHud();
            }

            function statusMessage(r) {
                if (!r) return '';
                switch (r.status) {
                    case 'selfintersect': return LABELS.selfIntersect;
                    case 'multi': return LABELS.multi;
                    case 'empty': return LABELS.empty;
                    case 'nobase': return LABELS.noBase;
                    default: return '';
                }
            }

            function renderHud() {
                const r = state.result;
                ui.area.innerHTML = LABELS.usefulArea + ': <b>' + (r && r.status === 'ok' ? formatArea(r.area) : '—') + '</b>';

                const msg = transientMsg || statusMessage(r);
                ui.msg.textContent = msg;
                ui.msg.classList.toggle('olx-error', !transientMsg && !!msg && state.ring.length >= 3);

                const drawing = state.mode === 'drawing';
                ui.hint.textContent = drawing ? (state.touch ? LABELS.hintDrawTouch : LABELS.hintDrawMouse) : LABELS.hintEdit;
                ui.btn.undo.hidden = !drawing;
                ui.btn.clear.hidden = !drawing;
                ui.btn.finish.hidden = !drawing;
                ui.btn.undo.disabled = state.ring.length === 0;
                ui.btn.clear.disabled = state.ring.length === 0;
                ui.btn.finish.disabled = state.ring.length < 3;
                ui.btn.remove.hidden = state.selected < 0;
                ui.btn.remove.disabled = !drawing && state.ring.length <= 3;
                ui.btn.resume.hidden = drawing;
                ui.btn.redraw.hidden = drawing;
            }

            /**************************************
             * RENDERIZAÇÃO
             **************************************/
            function tip() {
                if (state.mode !== 'drawing') return null;
                return state.placing || state.cursor;
            }

            function update() {
                const t = tip();
                const ring = state.ring;
                const preview = t ? ring.concat([t]) : ring;

                state.result = computeUseful(preview);

                if (state.mode === 'drawing') {
                    shapeFeature.setGeometry(preview.length >= 2
                        ? new ol.geom.LineString(preview.length >= 3 ? preview.concat([preview[0]]) : preview)
                        : null);
                } else {
                    shapeFeature.setGeometry(ring.length >= 3 ? new ol.geom.Polygon([ring.concat([ring[0]])]) : null);
                }
                usefulFeature.setGeometry(state.result.geom || null);
                vertexFeature.setGeometry(ring.length ? new ol.geom.MultiPoint(ring) : null);
                midpointFeature.setGeometry(ring.length >= 2 ? new ol.geom.MultiPoint(ring) : null);
                placingFeature.setGeometry(state.placing ? new ol.geom.Point(state.placing) : null);
                editSource.changed();
                renderHud();
            }

            /**************************************
             * AÇÕES
             **************************************/
            function pixelDist(a, b) {
                const pa = olMap.getPixelFromCoordinate(a);
                const pb = olMap.getPixelFromCoordinate(b);
                return Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
            }

            function hitVertex(coord) {
                const tol = sizes().hit;
                let best = -1;
                let bestD = Infinity;
                state.ring.forEach((v, i) => {
                    const d = pixelDist(v, coord);
                    if (d <= tol && d < bestD) { best = i; bestD = d; }
                });
                return best;
            }

            function hitMidpoint(coord) {
                const tol = sizes().hit;
                const res = olMap.getView().getResolution();
                let best = null;
                let bestD = Infinity;
                midpoints(res).forEach(m => {
                    const d = pixelDist(m.coord, coord);
                    if (d <= tol && d < bestD) { best = m; bestD = d; }
                });
                return best;
            }

            function addDrawingPoint(coord) {
                const ring = state.ring;
                const s = sizes();
                if (ring.length >= 3 && (pixelDist(ring[0], coord) <= s.hit || pixelDist(ring[ring.length - 1], coord) <= s.finishLast)) {
                    finishDrawing();
                    return;
                }
                if (ring.length > 0 && pixelDist(ring[ring.length - 1], coord) <= s.finishLast) {
                    return; // evita pontos duplicados (duplo clique/toque)
                }
                ring.push(coord.slice());
                update();
                emitResult();
            }

            function finishDrawing() {
                if (state.ring.length < 3) {
                    flash(LABELS.minPoints);
                    return;
                }
                state.mode = 'editing';
                state.cursor = null;
                state.placing = null;
                state.selected = -1;
                update();
                emitResult();
            }

            const actions = {
                undo() {
                    state.ring.pop();
                    state.selected = -1;
                    update();
                    emitResult();
                },
                clear() {
                    state.ring = [];
                    state.selected = -1;
                    update();
                    emitResult();
                },
                finish: finishDrawing,
                resume() {
                    state.mode = 'drawing';
                    state.selected = -1;
                    update();
                },
                remove() {
                    if (state.selected < 0 || (state.mode === 'editing' && state.ring.length <= 3)) return;
                    state.ring.splice(state.selected, 1);
                    state.selected = -1;
                    update();
                    emitResult();
                },
                redraw() {
                    state.ring = [];
                    state.mode = 'drawing';
                    state.selected = -1;
                    update();
                    emitResult();
                }
            };

            // Usado pela client action Map_ClearDrawnPolygon (não dispara OnDrawCoordinates)
            window.clearDrawPolygon = function () {
                state.ring = [];
                state.mode = 'drawing';
                state.selected = -1;
                state.lastEmitted = '|-1';
                update();
            };

            /**************************************
             * INTERAÇÃO (rato, toque e caneta)
             **************************************/
            function isMouse(e) {
                return !e.originalEvent || e.originalEvent.pointerType === 'mouse';
            }

            function setPointerType(e) {
                const touch = !isMouse(e);
                if (touch !== state.touch) {
                    state.touch = touch;
                    update();
                }
            }

            const editor = new ol.interaction.Pointer({
                handleDownEvent: function (e) {
                    setPointerType(e);
                    if (editor.targetPointers.length > 1) return false;
                    state.cancelled = false;
                    state.suppressClick = false;

                    const v = hitVertex(e.coordinate);
                    if (v >= 0) {
                        state.dragIndex = v;
                        state.dragOrigin = state.ring[v].slice();
                        state.dragMoved = false;
                        state.inserted = false;
                        state.cursor = null;
                        state.suppressClick = true;
                        return true;
                    }

                    const m = hitMidpoint(e.coordinate);
                    if (m) {
                        state.ring.splice(m.index + 1, 0, m.coord.slice());
                        state.dragIndex = m.index + 1;
                        state.dragOrigin = null;
                        state.dragMoved = false;
                        state.inserted = true;
                        state.selected = -1;
                        state.cursor = null;
                        state.suppressClick = true;
                        update();
                        return true;
                    }

                    if (state.mode === 'drawing' && !isMouse(e)) {
                        state.placing = e.coordinate.slice();
                        update();
                        return true;
                    }
                    return false; // rato no modo desenho: ponto adicionado no 'click'
                },
                handleDragEvent: function (e) {
                    if (state.cancelled) return;
                    if (editor.targetPointers.length > 1) {
                        cancelGesture();
                        return;
                    }
                    if (state.placing) {
                        state.placing = e.coordinate.slice();
                        update();
                    } else if (state.dragIndex >= 0) {
                        state.ring[state.dragIndex] = e.coordinate.slice();
                        state.dragMoved = true;
                        update();
                    }
                },
                handleUpEvent: function () {
                    if (state.cancelled) {
                        state.cancelled = false;
                        return false;
                    }
                    if (state.placing) {
                        const p = state.placing;
                        state.placing = null;
                        addDrawingPoint(p);
                        update();
                    } else if (state.dragIndex >= 0) {
                        const i = state.dragIndex;
                        state.dragIndex = -1;
                        if (!state.dragMoved && !state.inserted) {
                            const n = state.ring.length;
                            if (state.mode === 'drawing' && n >= 3 && (i === 0 || i === n - 1)) {
                                // Toque no primeiro ponto, ou duplo toque/clique no último: termina
                                finishDrawing();
                                return false;
                            }
                            state.selected = state.selected === i ? -1 : i;
                            update();
                        } else {
                            state.selected = -1;
                            update();
                            emitResult();
                        }
                    }
                    return false;
                },
                handleMoveEvent: function (e) {
                    if (!isMouse(e)) return;
                    setPointerType(e);
                    if (state.mode === 'drawing') {
                        state.cursor = e.coordinate.slice();
                        update();
                    }
                    const over = hitVertex(e.coordinate) >= 0 || !!hitMidpoint(e.coordinate);
                    olMap.getViewport().style.cursor = over ? 'grab' : (state.mode === 'drawing' ? 'crosshair' : '');
                },
                // Não bloqueia o pointerdown: pan/pinch com dois dedos continuam a funcionar.
                // O pan com um dedo é bloqueado pela condição do DragPan (drawPanGuard).
                stopDown: function () { return false; }
            });

            function cancelGesture() {
                state.cancelled = true;
                if (state.placing) {
                    state.placing = null;
                } else if (state.dragIndex >= 0) {
                    if (state.inserted) state.ring.splice(state.dragIndex, 1);
                    else if (state.dragOrigin) state.ring[state.dragIndex] = state.dragOrigin;
                    state.dragIndex = -1;
                }
                update();
            }

            drawPanGuard = function () {
                const capturing = (state.placing !== null || state.dragIndex >= 0) && editor.targetPointers.length < 2;
                return !capturing;
            };

            // Clique do rato no modo desenho + bloqueio do zoom por duplo clique/toque
            const editorGuard = new ol.interaction.Interaction({
                handleEvent: function (e) {
                    if (e.type === 'click' && state.suppressClick) {
                        state.suppressClick = false;
                        return false;
                    }
                    if (e.type === 'click' && state.mode === 'drawing' && isMouse(e)) {
                        addDrawingPoint(e.coordinate);
                        return false;
                    }
                    if (e.type === 'dblclick') return false;
                    return true;
                }
            });

            olMap.addInteraction(editor);
            olMap.addInteraction(editorGuard);

            olMap.getViewport().addEventListener('mouseleave', function () {
                if (state.cursor) {
                    state.cursor = null;
                    update();
                }
            });

            // Teclado (desktop): Enter conclui, Backspace/Delete desfaz/remove, Escape cancela
            function onKeyDown(e) {
                if (!target.isConnected) {
                    window.removeEventListener('keydown', onKeyDown);
                    return;
                }
                const el = e.target;
                if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;

                if (state.mode === 'drawing') {
                    if (e.key === 'Enter') { finishDrawing(); e.preventDefault(); }
                    else if ((e.key === 'Backspace' || e.key === 'Delete') && state.ring.length) { actions.undo(); e.preventDefault(); }
                    else if (e.key === 'Escape') { actions.clear(); }
                } else {
                    if ((e.key === 'Backspace' || e.key === 'Delete') && state.selected >= 0) { actions.remove(); e.preventDefault(); }
                    else if (e.key === 'Escape') { state.selected = -1; update(); }
                }
            }
            window.addEventListener('keydown', onKeyDown);

            update();
            state.lastEmitted = resultKey(computeUseful(state.ring));
        }

        /****** FIM - Desenhar polígono ******/



        /****** Overlay informativo: CTRL + Scroll ******/

        // Cria o overlay (div invisível inicialmente)
        var mapZoomOverlay = document.createElement('div');
        mapZoomOverlay.id = 'map-zoom-overlay'+ $parameters.GUID;
        mapZoomOverlay.style.position = 'absolute';
        mapZoomOverlay.style.top = '0';
        mapZoomOverlay.style.left = '0';
        mapZoomOverlay.style.width = '100%';
        mapZoomOverlay.style.height = '100%';
        mapZoomOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        mapZoomOverlay.style.display = 'flex';
        mapZoomOverlay.style.justifyContent = 'center';
        mapZoomOverlay.style.alignItems = 'center';
        mapZoomOverlay.style.color = '#fff';
        mapZoomOverlay.style.fontSize = '16px';
        mapZoomOverlay.style.fontFamily = 'Open Sans, sans-serif';
        mapZoomOverlay.style.zIndex = '999';
        mapZoomOverlay.style.textAlign = 'center';
        mapZoomOverlay.style.padding = '20px';
        mapZoomOverlay.style.boxSizing = 'border-box';
        mapZoomOverlay.style.backdropFilter = 'blur(2px)';
        mapZoomOverlay.style.display = 'none';
        mapZoomOverlay.innerText = $parameters.ZoomMapOverlayMessage || 'Use CTRL + scroll para aplicar zoom no mapa';

        // Adiciona o overlay dentro do container do mapa
        olMap.getTargetElement().style.position = 'relative';
        olMap.getTargetElement().appendChild(mapZoomOverlay);

        // Controla exibição com eventos de scroll e teclado
        let overlayTimeout = null;

        // Mostra o overlay quando o utilizador faz scroll sem Ctrl
        olMap.getViewport().addEventListener('wheel', function (event) {
            if (!event.ctrlKey) {
                event.preventDefault();
                mapZoomOverlay.style.display = 'flex';

                // Reinicia o timeout para esconder após inatividade
                clearTimeout(overlayTimeout);
                overlayTimeout = setTimeout(() => {
                    mapZoomOverlay.style.display = 'none';
                }, 3000);
            }
        }, { passive: false });

        // Esconde o overlay quando pressionar qualquer tecla
        window.addEventListener('keydown', function () {
            mapZoomOverlay.style.display = 'none';
        });

        // Esconde o overlay quando clicar com o mouse (qualquer botão exceto scroll)
        window.addEventListener('mousedown', function (event) {
            if (event.button !== 1) { // 0 = esquerdo, 1 = scroll, 2 = direito
                mapZoomOverlay.style.display = 'none';
            }
        });


        
        /******* Renderização do mapa *******/
        window.OpenLayers = window.OpenLayers || {};
        OpenLayers.Map = olMap;
        window.olMap = olMap; // usado pelo Map_ResetOpenLayersEnvironment para destruir a instância anterior
        /******* FIM - Renderização do mapa *******/

    } else {
        console.error('OpenLayers não está carregado.');
    }
})();
