sap.ui.define([
	"sap/ui/base/ManagedObject",
    "sap/ui/core/BusyIndicator",
], function(
    ManagedObject,
	BusyIndicator
) {
	"use strict";

	return ManagedObject.extend("com.tasa.configuraciones.controller.AyudaBusquedaEmb", {

        constructor: function(oView) {
            this._oView = oView;
            this._oControl = sap.ui.xmlfragment(oView.getId(), "com.tasa.configuraciones.fragments.AyudaBusquedaEmb",this);
            this._bInit = false;
        },
        /**
         * @override
         */
        onInit: function() {
            // BaseController.prototype.onInit.apply(this, arguments);
            this._oFragment = this.getControl();
        },
        /**
         * @override
         */
        onExit: function() {
            // BaseController.prototype.onExit.apply(this, arguments);
            this._oFragment.destroy();
        },

        getController:function(){
            return this.getView().getController();
        },
        getView: function() {
			return this._oView;
        },

        getControl:function(){
            return this._oControl;
        },

        open:function(){
            let oView = this._oView;
			let oControl = this._oControl;

            if (!this._bInit) {
				// Initialize our fragment
				this.onInit();
				this._bInit = true;
                oView.addDependent(oControl);
			}

			var args = Array.prototype.slice.call(arguments);
			if (oControl.open) {
				oControl.open.apply(oControl, args);
			} else if (oControl.openBy) {
				oControl.openBy.apply(oControl, args);
			}

        },

        close:function(){
            this._oControl.close();
            this.onExit();
        },

        onPressSearchEmbar:function(sPage){
            BusyIndicator.show(0);
            let oModelMaster = this.getController().getModel("DATOSMAESTRO"),
            oDataEmbar = oModelMaster.getProperty("/searchEmbar"),
            oService={},
            aOptions=[],
            aOptions2=[];

            oService.PATH = "/api/embarcacion/ConsultarEmbarcacion/";
            oService.MODEL = "DATOSMAESTRO";
            oService.param = {
                option: [],
                option2: [],
                options: aOptions,
                options2: aOptions2,
                p_pag: sPage,
                p_user: "BUSQEMB"
              }
            
            aOptions.push({
                cantidad: "20",
                control: "COMBOBOX",
                key: "ESEMB",
                valueHigh: "",
                valueLow: "O"
            });
            if(oDataEmbar["CDEMB"]){
                aOptions.push({
                    cantidad: "20",
                    control: "INPUT",
                    key: "CDEMB",
                    valueHigh: "",
                    valueLow: oDataEmbar["CDEMB"]
                })
            }
            if(oDataEmbar["NMEMB"]){
                aOptions.push({
                    cantidad: "20",
                    control: "INPUT",
                    key: "NMEMB",
                    valueHigh: "",
                    valueLow: oDataEmbar["NMEMB"]
                })
            }
            if(oDataEmbar["MREMB"]){
                aOptions.push({
                    cantidad: "20",
                    control: "INPUT",
                    key: "MREMB",
                    valueHigh: "",
                    valueLow: oDataEmbar["MREMB"]
                })
            }
            if(oDataEmbar["INPRP"]){
                aOptions.push({
                    cantidad: "20",
                    control: "COMBOBOX",
                    key: "INPRP",
                    valueHigh: "",
                    valueLow: oDataEmbar["INPRP"]
                })
            }
            if(oDataEmbar["STCD1"]){
                aOptions2.push({
                    cantidad: "20",
                    control: "INPUT",
                    key: "STCD1",
                    valueHigh: "",
                    valueLow: oDataEmbar["STCD1"]
                })
            }
            if(oDataEmbar["NAME1"]){
                aOptions2.push({
                    cantidad: "20",
                    control: "INPUT",
                    key: "NAME1",
                    valueHigh: "",
                    valueLow: oDataEmbar["NAME1"]
                })
            }

            this.getController().getDataSearchHelp(oService);

        },
		
		onSelectItem:function(oEvent){
			let oContext = oEvent.getSource().getBindingContext("DATOSMAESTRO"),
			oModelMaster = oContext.getModel(),
			sIdControl = oModelMaster.getProperty("/idControl"),
			oCodEmb = oContext.getProperty("CDEMB"),
			oControl = this.getController().mFields[sIdControl];
			oControl.setValue(oCodEmb);
			this.close();
		},

        onCleanSearh:function(oEvent){
            let oContext = oEvent.getSource().getBindingContext("DATOSMAESTRO"),
            oModelMaster = oContext.getModel();
            oModelMaster.setProperty("/searchEmbar",{})
        },

        onUpdateTable:function(oEvent){
            let oTotal = oEvent.getParameter("total"),
            oActual = oEvent.getParameter("actual"),
			oModelMaster = oEvent.getSource().getModel("DATOSMAESTRO"),
			sPage,
			sTotalPag;
            if(oTotal>0){
				sPage = oModelMaster.getProperty("/pageTable")["page"];
				sTotalPag = oModelMaster.getProperty("/dataEmbarcaciones")["p_totalpag"];
				this.addPagination("HelpTable",sTotalPag,sPage);
			}
        },

        addPagination:function(idTable,sTotalPag,sPage){
            var oTable = this.getView().byId(idTable);
			var oContentHolder = oTable.getParent().getParent();

            this._destroyControl("selectPage");

			this._destroyControl("vbox1");
			var oVBox1 = new sap.m.VBox("vbox1", {
			});

			this._destroyControl("hbox1");
			var oHBox1 = new sap.m.HBox("hbox1", {
				justifyContent: "SpaceBetween",
				width: "100%"
			});

			this._destroyControl("hboxPagination");
			var oHBoxPagination = new sap.m.HBox("hboxPagination", {
				justifyContent: "Center",
				width: "75%"
			});

			oHBoxPagination.setWidth("");
			oHBox1.setJustifyContent("Center");
			oHBox1.addItem(oHBoxPagination);
			oVBox1.addItem(oHBox1);
			oContentHolder.addContent(oVBox1);

			this.generatePaginator(sTotalPag,sPage);
        },

        generatePaginator:function(sTotalPag,sPage){
			var countPerPage = 10;

			this.oPagination.container = sap.ui.getCore().byId("hboxPagination");
			this.oPagination.container.destroyItems();
			this.oPagination.init({
				size: parseInt(sTotalPag) ,
				page: parseInt(sPage)||1,
				step: 5,
				// table: oTablex,
				// countTable: countTable,
				countPerPage: countPerPage,
				// tableData: aDataTable,
				// devicePhone: this._devicePhone,
				// deviceTablet: this._deviceTablet
				controller:this
			});
        },

        oPagination: {
			container: {},
			init: function (properties) {
				this.Extend(properties);
				this.Start();
			},

			Extend: function (properties) {
				properties = properties || {};
				this.size = properties.size || 1;
				this.page = properties.page || 1;
				this.step = properties.step || 5;
				this.countPerPage = properties.countPerPage || 10;
				this.controller = properties.controller;
			},

			Start: function () {
				this.container.destroyItems();
				var oSelect = new sap.m.Select("selectPage", {
					change: this.SelectChange.bind(this),
				});
				this.container.addItem(oSelect);

				this.AddNumber(1, this.size + 1);

				this.setFixedButtons();
				var aSelectItems = oSelect.getItems();

				for (var k = 0; k < aSelectItems.length; k++) {
					var item = aSelectItems[k];
					var r = item.getText();

					if (r === this.page.toString()) {
						oSelect.setSelectedItem(item);
					}
				}
			},

			AddNumber: function (s, f) {
				for (var i = s; i < f; i++) {
					sap.ui.getCore().byId("selectPage").addItem(
						new sap.ui.core.Item({
							key: i,
							text: i
						})
					);
				}
			},

			AddFirstNumber: function () {
				sap.ui.getCore().byId("selectPage").insertItem(
					new sap.ui.core.Item({
						key: 1,
						text: 1
					}, 2)
				);
			},
			AddLastNumber: function () {
				sap.ui.getCore().byId("selectPage").insertItem(
					new sap.ui.core.Item({
						key: this.size,
						text: this.size
					}, this.size - 3)
				);
			},
			SelectChange: function (oEvent) {
				this.page = parseInt(oEvent.getParameters().selectedItem.getText());
				this.Start();
				this.controller.onPressSearchEmbar(this.page)
			},
			ClickNumber: function (oEvent) {
				this.page = parseInt(oEvent.getSource().getText());
				this.Start();
				this.controller.onPressSearchEmbar(this.page)
			},

			ClickPrev: function () {
				this.page--;
				if (this.page < 1) {
					this.page = 1;
				}
				this.Start();
				this.controller.onPressSearchEmbar(this.page)
			},

			ClickNext: function () {
				this.page++;
				if (this.page > this.size) {
					this.page = this.size;
				}
				this.Start();
				this.controller.onPressSearchEmbar(this.page)
			},

			ClickFirst: function () {
				this.page = 1;
				if (this.page < 1) {
					this.page = 1;
				}
				this.Start();
				this.controller.onPressSearchEmbar(this.page)
			},

			ClickLast: function () {
				this.page = this.size;
				if (this.page > this.size) {
					this.page = this.size;
				}
				this.Start();
				this.controller.onPressSearchEmbar(this.page)
			},

			setFixedButtons: function (e) {
				var oButton = new sap.m.Button({
					icon: "sap-icon://close-command-field",
					type:"Transparent",
					press: this.ClickFirst.bind(this)
				});
				this.container.insertItem(oButton, 0);

				var oButton = new sap.m.Button({
					icon: "sap-icon://navigation-left-arrow",
					type:"Transparent",
					press: this.ClickPrev.bind(this)
				});

				this.container.insertItem(oButton, 1);

				oButton = new sap.m.Button({
					icon: "sap-icon://navigation-right-arrow",
					type:"Transparent",
					press: this.ClickNext.bind(this)
				});
				this.container.insertItem(oButton, this.size + 2);

				var oButton = new sap.m.Button({
					icon: "sap-icon://open-command-field",
					type:"Transparent",
					press: this.ClickLast.bind(this)
				});
				this.container.insertItem(oButton, this.size + 3);
			}
        },
        _destroyControl: function (id) {
			let oControl = this.getView().byId(id);
			if (oControl !== undefined) oControl.destroy();

			oControl = sap.ui.getCore().byId(id);
			if (oControl !== undefined) oControl.destroy();
		}

	});
});