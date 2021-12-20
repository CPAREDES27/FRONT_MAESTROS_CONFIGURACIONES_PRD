sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History"
], function (Controller, History) {
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

		getDataService:function(sUrl,oBody){
			const oDataPromise = fetch(sUrl,{
				method:'POST',
				body:JSON.stringify(oBody)
			});
			return oDataPromise;
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

	});

});