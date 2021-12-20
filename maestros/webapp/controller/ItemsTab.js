sap.ui.define([], 
    function() {
    'use strict';
    let itemsTabBar=[
        {
            key:"01",
            text:"General",
            icon:"sap-icon://information",
        },
        {
            key:"02",
            text:"Permisos",
            icon:"sap-icon://permission",
            iconColor:"Critical"
        },
        {
            key:"03",
            text:"Equipamiento",
            icon:"sap-icon://add-equipment",
        },
        {
            key:"04",
            text:"Bodegas",
            icon:"sap-icon://BusinessSuiteInAppSymbols/icon-ship"
        },
        {
            key:"05",
            text:"Horómetro",
            icon:"sap-icon://SAP-icons-TNT/start-timer-event",
        },
        {
            key:"06",
            text:"Imagen",
            icon:"sap-icon://image-viewer",
        }
    ];
    return itemsTabBar;
});


