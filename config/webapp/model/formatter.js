sap.ui.define([], function () {
	"use strict";

	return {
		/**
		 * Rounds the currency value to 2 digits
		 *
		 * @public
		 * @param {string} sValue value to be formatted
		 * @returns {string} formatted currency value with 2 digits
		 */
		currencyValue : function (sValue) {
			if (!sValue) {
				return "";
			}

			return parseFloat(sValue).toFixed(2);
		},

		/**
		 * No esta funcionando
		 * @param {*} sCodPesca 
		 * @returns 
		 */
		setTipoPesca:function(sCodPesca){
			if(sCodPesca){
				let oModel = this.getView().getModel("DATOSMAESTRO"),
				aDataTipoPesca = oModel.getProperty("/CDTPC"),
				sDescTipoPesca;
				aDataTipoPesca.forEach(item => {
					if(item["id"] === sCodPesca) sDescTipoPesca = item.descripcion;
				});
				return sDescTipoPesca;
			}else{
				return sCodPesca;
			}
		},

		setFormatHour:function(sHour){
			if(sHour){
				let sFormattedHour = sHour.replace(/:/g,""); 
				if(sFormattedHour.length === 2) sFormattedHour = `${sFormattedHour}0000`
				if(sFormattedHour.length === 4) sFormattedHour = `${sFormattedHour}00`
				return sFormattedHour;
			}
		},


		/**
		 * Formato para la tabla dinamica
		 * @param {string} sText 
		 */
		formatTable:function(sText){
			console.log(sText)
		}
	};
});