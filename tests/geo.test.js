// Unit tests for OLMapKit.geo (run with: npm test)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.jsts = require('jsts');
const geo = await import('../src/geo/ops.js');

// ~100 m x ~100 m square near the equator
const d = 100 / 111319.49;
const square = { type: 'Polygon', coordinates: [[[0, 0], [d, 0], [d, d], [0, d], [0, 0]]] };

test('area and perimeter of a 100 m square', () => {
    assert.ok(Math.abs(geo.area(square) - 10000) < 60, 'area ' + geo.area(square));
    assert.ok(Math.abs(geo.perimeter(square) - 400) < 2, 'perimeter ' + geo.perimeter(square));
});

test('distance and bearing', () => {
    assert.ok(Math.abs(geo.distance([0, 0], [0, 1]) - 111195) < 50);
    assert.ok(Math.abs(geo.bearing([0, 0], [1, 0]) - 90) < 0.01);
    assert.ok(Math.abs(geo.bearing([0, 0], [0, -1]) - 180) < 0.01);
});

test('buffer is in metres', () => {
    const b = geo.buffer({ type: 'Point', coordinates: [-8.6, 41.15] }, 50, 32);
    const a = geo.area(b);
    assert.ok(Math.abs(a - Math.PI * 2500) / (Math.PI * 2500) < 0.02, 'area ' + a);
});

test('split a square in two with a line', () => {
    const line = { type: 'LineString', coordinates: [[d / 2, -d], [d / 2, 2 * d]] };
    const parts = geo.split(square, line);
    assert.equal(parts.length, 2);
    const total = parts.reduce((s, p) => s + geo.area(p), 0);
    assert.ok(Math.abs(total - geo.area(square)) < 1);
});

test('union, difference and intersection', () => {
    const shifted = { type: 'Polygon', coordinates: [[[d / 2, 0], [1.5 * d, 0], [1.5 * d, d], [d / 2, d], [d / 2, 0]]] };
    assert.ok(Math.abs(geo.area(geo.union(square, shifted)) - 15000) < 100);
    assert.ok(Math.abs(geo.area(geo.difference(square, shifted)) - 5000) < 50);
    assert.ok(Math.abs(geo.area(geo.intersection(square, shifted)) - 5000) < 50);
});

test('validate detects a bow-tie', () => {
    const bow = { type: 'Polygon', coordinates: [[[0, 0], [d, d], [d, 0], [0, d], [0, 0]]] };
    const r = geo.validate(bow);
    assert.equal(r.valid, false);
    assert.ok(r.location);
    assert.equal(geo.validate(square).valid, true);
});
