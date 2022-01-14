sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/base/Log",
	"sap/ui/core/BusyIndicator",
], function (Controller, History,Log,BusyIndicator) {
	"use strict";

	return Controller.extend("com.tasa.maestros.controller.BaseController", {
		/**
		 * Convenience method for accessing the router in every controller of the application.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter : function () {
			return this.getOwnerComponent().getRouter();
		},

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel : function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel : function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle : function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Event handler for navigating back.
		 * It there is a history entry we go one step back in the browser history
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBack : function() {
			var sPreviousHash = History.getInstance().getPreviousHash();

			if (sPreviousHash !== undefined) {
				// eslint-disable-next-line sap-no-history-manipulation
				history.go(-1);
			} else {
				this.getRouter().navTo("master", {}, true);
			}
		},

		/**
		 * 
		 * @returns url service
		 */
		 getHostService: function () {
            var urlIntance = window.location.origin,
            servicioNode ; 

			if (urlIntance.indexOf('tasaqas') !== -1) {
                servicioNode = 'qas'; // aputando a QAS
            } else if (urlIntance.indexOf('tasaprd') !== -1) {
                servicioNode = 'prd'; // apuntando a PRD
            }else if(urlIntance.indexOf('localhost') !== -1){
				servicioNode = 'cheerful-bat-js'; // apuntando a DEV
			}else{
				servicioNode = 'cheerful-bat-js'; // apuntando a DEV
			}

            return `https://cf-nodejs-${servicioNode}.cfapps.us10.hana.ondemand.com`;
        },

		/**
		 * 
		 * @returns url of subaccount 
		 */
		 getHostSubaccount: function () {
            var urlIntance = window.location.origin,
            sUrlSubaccount,
            sParam; 

			if (urlIntance.indexOf('tasaqas') !== -1) {
                sUrlSubaccount = 'tasaqas'; // aputando a QAS
                sParam = "IDH4_QAS"
            } else if (urlIntance.indexOf('tasaprd') !== -1) {
                sUrlSubaccount = 'tasaprd'; // apuntando a PRD
                sParam = "IDH4_PRD"
            }else if(urlIntance.indexOf('localhost') !== -1){
				sUrlSubaccount = 'tasadev'; // apuntando a DEV
                sParam = "IDH4_DEV"
			}else{
				sUrlSubaccount = 'tasadev'; // apuntando a DEV
                sParam = "IDH4_DEV"
			}

            return {
                url : `https://${sUrlSubaccount}.launchpad.cfapps.us10.hana.ondemand.com`, 
                param : sParam
            };
        },

		Count:0,

		CountService:0,
		
		getMessageDialog:function(sTypeDialog,sMessage){
			let oMessageDialog;
			if (!oMessageDialog) {
				oMessageDialog = new sap.m.Dialog({
					type: sap.m.DialogType.Message,
					title: "Mensaje",
					state: sTypeDialog,
					content: new sap.m.Text({ text: sMessage }),
					beginButton: new sap.m.Button({
						type: sap.m.ButtonType.Emphasized,
						text: "OK",
						press: function () {
							// BusyIndicator.show(0);
							oMessageDialog.close();
						}.bind(this)
					})
				});
			}

			oMessageDialog.open();
		},
		
		buildPanels:function(sTitle){
			const oControl = new sap.m.Panel({
				expandable:true,
				headerText:sTitle
			});
			return oControl;
		},

		/**
		 * Method for getting data from services
		 * @param {*} sUrl 
		 * @param {*} oBody 
		 * @returns 
		 */
		getDataService: async function(sUrl,oBody){
			try {
				BusyIndicator.show(0);
				this.Count++;
				let oFetch = await fetch(sUrl,{
					method:'POST',
					body:JSON.stringify(oBody)
				});
				if(oFetch.status===200){
					if(this.Count === this.CountService) BusyIndicator.hide();
					return await oFetch.json();
				}else{
					BusyIndicator.hide();
					Log.error(`Status:${oFetch.status}, ${oFetch.statusText}`);
					return null;
				}
			} catch (error) {
				Log.error(`Error:${error}`);
				BusyIndicator.hide();
				this.getMessageDialog("Error","No se pudo conectar");
			}
		},

		/**
		 * 
		 * @returns User loggued
		 */
		_getCurrentUser: async function(){
            let oUshell = sap.ushell,
            oUser={};
            if(oUshell){
                oUser = await sap.ushell.Container.getServiceAsync("UserInfo");
                let sEmail = oUser.getEmail().toUpperCase(),
                sName = sEmail.split("@")[0],
                sDominio= sEmail.split("@")[1];
                if(sDominio === "XTERNAL.BIZ") sName = "FGARCIA";
                oUser = {
                    email:sEmail,
                    name:sName
                }
            }else{
                oUser = {
                    email:"CTIRADO@XTERNAL.BIZ",
                    name: "FGARCIA"
                };
            }
			return oUser
        },

		paramDate:function(oDate){
				let day = oDate.getDate()
				let month = oDate.getMonth() + 1
				let year = oDate.getFullYear()
	
				if(month < 10)
					month=`0${month}`;
				if(day < 10)
					day = `0${day}`;
				return `${year}${month}${day}`
		},

		/**
		 *  Ingresa string dd/mm/yyyy ; retorna yyyymmdd
		 * @param {string} sDate 
		 * @returns 
		 */
		 formatDateInverse:function(sDate){
			if(sDate){
				let sNewDate =`${sDate.split("/")[2]}${sDate.split("/")[1]}${sDate.split("/")[0]}`;
				return sNewDate;
			}else{
				return "";
			}
		},

	});

});