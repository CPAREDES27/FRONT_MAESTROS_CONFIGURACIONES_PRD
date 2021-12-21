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
		}
	};
});