(function (mapContainerId) {
    try {
        console.log("🧹 Iniciando limpeza do mapa OpenLayers...");

        if (window.olMap) {
            try {
                olMap.getInteractions().clear();
                olMap.getOverlays().clear();

                olMap.getLayers().forEach(function(layer) {
                    try {
                        var source = layer.getSource ? layer.getSource() : null;
                        if (source && source.clear) source.clear();
                        olMap.removeLayer(layer);
                    } catch (innerErr) {
                        console.warn("⚠️ Erro ao limpar layer:", innerErr);
                    }
                });

                olMap.getLayers().clear();
                olMap.setTarget(null);
                console.log("✅ Instância anterior do OpenLayers removida.");
            } catch (err) {
                console.warn("⚠️ Erro ao limpar olMap:", err);
            }
        }

        if (mapContainerId) {
            var container = document.getElementById(mapContainerId);
            if (container) {
                try {
                    // 🔹 NOVO: capturar o tooltip antes da limpeza
                    var tooltip = container.querySelector('.tooltip, #tooltip, [id*="Tooltip"]');
                    var savedTooltip = null;
                    if (tooltip) {
                        savedTooltip = tooltip.cloneNode(true); // clona o tooltip atual
                    }

                    // 🔹 Limpa o container normalmente
                    if (container.replaceChildren) container.replaceChildren();
                    else container.innerHTML = "";
                    console.log("🧽 Container #" + mapContainerId + " limpo com sucesso.");

                    // 🔹 Reanexa o tooltip após a limpeza
                    if (savedTooltip) {
                        container.appendChild(savedTooltip);
                        console.log("🎯 Tooltip preservado após limpeza.");
                    }
                } catch (err) {
                    console.warn("⚠️ Erro ao limpar container #" + mapContainerId + ":", err);
                    container.innerHTML = "";
                }
            } else {
                console.warn("⚠️ Container com ID '" + mapContainerId + "' não encontrado no DOM.");
            }
        }

        // Limpa variáveis globais do mapa
        delete window.olMap;
        delete window.drawVector;
        delete window.drawInteraction;
        delete window.clearDrawPolygon;
        delete window.hasDrawnPolygon;
        delete window.polygonVectorSource;

        console.log("✅ Mapa e variáveis globais limpos completamente.");
    } catch (err) {
        console.error("💥 Erro crítico ao limpar o mapa:", err);
    }
})($parameters.MapDiv);
