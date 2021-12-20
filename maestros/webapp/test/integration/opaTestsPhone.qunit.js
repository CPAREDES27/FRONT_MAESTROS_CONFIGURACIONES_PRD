/* global QUnit */

QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function() {
	"use strict";

	sap.ui.require([
		"com/tasa/maestros/test/integration/PhoneJourneys"
	], function() {
		QUnit.start();
	});
});