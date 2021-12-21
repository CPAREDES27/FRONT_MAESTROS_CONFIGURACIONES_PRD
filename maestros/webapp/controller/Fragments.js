sap.ui.define([
    "sap/ui/base/ManagedObject",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/ui/layout/form/FormContainer",
    "sap/ui/layout/form/FormElement",
    "sap/m/IconTabBar",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    "sap/ui/export/Spreadsheet",
    "sap/ui/unified/ColorPickerPopover",
	"sap/ui/unified/library",
    'sap/ui/core/library',
    "sap/ui/core/Fragment",
    "../model/formatter"
    // "../data/data"
], function(
        ManagedObject,
        Column,
        ColumnListItem,
        FormContainer,
        FormElement,
        IconTabBar,
        BusyIndicator,
        Filter,
        FilterOperator,
        Spreadsheet,
        ColorPickerPopover,
        unifiedLibrary,
        coreLibrary,
        Fragment,
        formatter
        // Data
    ) {
    'use strict';

    var ColorPickerMode = unifiedLibrary.ColorPickerMode,
		ColorPickerDisplayMode = unifiedLibrary.ColorPickerDisplayMode,
		CSSColor = coreLibrary.CSSColor,
		ValueState = coreLibrary.ValueState;

    const HOST2 = "https://tasaqas.launchpad.cfapps.us10.hana.ondemand.com";

    return ManagedObject.extend("com.tasa.maestros.controller.Fragments",{
        constructor: function(oView,sFragName) {
			this._oView = oView;
			this._oControl = sap.ui.xmlfragment(oView.getId(), "com.tasa.maestros.fragments."+sFragName,this);
			this._bInit = false;
		},

        formatter: formatter,

		exit: function() {
			delete this._oView;
		},

		getView: function() {
			return this._oView;
        },
        
        getController:function(){
            return this.getView().getController();
        },

		getControl: function() {
			return this._oControl;
		},

		getOwnerComponent: function() {
			return this._oView.getController().getOwnerComponent();
		},

		openBy: function() {
			var oView = this._oView;
			var oControl = this._oControl;
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

		close: function(oEvent) {
            const oDialog = oEvent.getSource().getParent();
            let aContentDialog = oDialog.removeAllContent(),
            oModelMaster = this.getController().getModel("DATOSMAESTRO"),
            aContainers = aContentDialog[0].mAggregations.formContainers,
            aRemovedContainers,
            aContentbar;
            if(aContainers){
                aRemovedContainers=aContentDialog[0].removeAllFormContainers();
                aRemovedContainers.forEach(element=>element.removeAllFormElements)
            }else{
                aContentDialog.forEach(content=>{
                    aContentbar = content.removeAllContent();
                });
                aContentbar.forEach(content=>{
                    let aContentPanels,
                    aFormsCont;
                    if(content.mAggregations.formContainers){
                        // aFormsCont = content.removeAllFormContainers();
                        // aFormsCont.forEach(element=>element.removeAllFormElements())
                    }else if(content.mAggregations.columns){
                        // content.removeAllColumns();
                    }else{
                        aContentPanels = content.removeAllContent();
                        aContentPanels.forEach(form=>{
                            aFormsCont = form.removeAllFormContainers();
                            aFormsCont.forEach(element=>element.removeAllFormElements())
                        })
                    }
                })

            }
            oModelMaster.setProperty("/s_pe",[])
            oModelMaster.setProperty("/s_ps",[])
            oModelMaster.setProperty("/s_ee",[]);
            oModelMaster.setProperty("/s_be",[]);
            oModelMaster.setProperty("/str_hor",[]);
            oDialog.close();
            // this._oFragment.removeAllContent();
		},

		setRouter: function(oRouter) {
			this.oRouter = oRouter;
		},
		getBindingParameters: function() {
			return {};
		},
		onInit: function() {
			this._oFragment = this.getControl();
		},
		onExit: function() {
			this._oFragment.destroy();
        },
        
        /**
         *  Creacion de columnas
         */
        setColumnas:function(oMaster,param){
            this.getController().getModel("detailView").setProperty("/visibleBtnNew", false)
            let oControl=this._oControl,
            oView = this._oView,
            oColumn,
            oText,
            aFields =  oMaster.fields.filter(oField=>oField.CONTROLTABLE);
            if(param==="M13")
                aFields =  aFields.filter(oField=>oField.KEYTAB.split("/")[0]==="T00");
            if(param==="02")
                aFields =  aFields.filter(oField=>oField.KEYTAB==="T02");
            if(param==="03")
                aFields =  aFields.filter(oField=>oField.KEYTAB==="T03");
            if(param==="04")
                aFields =  aFields.filter(oField=>oField.KEYTAB==="T04");
            if(param==="05")
                aFields =  aFields.filter(oField=>oField.KEYTAB==="T05");
            if(param==="06")
                aFields =  aFields.filter(oField=>oField.KEYTAB==="T06");
            aFields.forEach(oCol => {
                oColumn = new Column({
                    demandPopin:true,
                    minScreenWidth:"Large"
                });
                oText = new sap.m.Text({text:oCol.NAMEFIELD});
                oColumn.setHeader(oText);
                oControl.addColumn(oColumn);
            });
            let oColEdit,
            aFieldsNew =  oMaster.fields.filter(oField=>oField.CONTROLNEW);
            if(aFieldsNew.length>0){
                this.getController().getModel("detailView").setProperty("/visibleBtnNew", true)
                oColEdit = new Column({
                    demandPopin:true,
                    minScreenWidth:"Large"
                })
                oColEdit.setHeader(new sap.m.Text({text:"EDITAR"}))
                oControl.addColumn(oColEdit);
            }
        },
        
        /**
         * Creacion de items
         */

         setItems:function(oMaster,param){
             let oControl=this.getControl(),
             that = this,
             oService = oMaster.services.find(serv=>serv.IDSERVICE==="TABLE"),
             oModel = this.getController().getModel(oService.MODEL),
             aCells=[],
             aFieldsTable=[],
             aDataField=[],
             aKeys,
             i;
             aFieldsTable=oMaster.fields.filter(oField=>oField.CONTROLTABLE);
             if(param==="M13")
                aFieldsTable =  aFieldsTable.filter(oField=>oField.KEYTAB.split("/")[0]==="T00");
             if(param==="02"){
                 aFieldsTable =  aFieldsTable.filter(oField=>oField.KEYTAB==="T02");
                 oService.PROPERTY="/s_ps"
                 aDataField = oModel.getProperty("/s_ps");
                 if(aDataField?.length>0)
                    aKeys = Object.keys(aDataField[0]);
             }
             if(param==="03"){
                aFieldsTable =  aFieldsTable.filter(oField=>oField.KEYTAB==="T03");
                oService.PROPERTY="/s_ee"
                aDataField = oModel.getProperty("/s_ee");
                if(aDataField?.length>0)
                    aKeys = Object.keys(aDataField[0]);
             }

             if(param==="04"){
                aFieldsTable =  aFieldsTable.filter(oField=>oField.KEYTAB==="T04");
                 oService.PROPERTY="/s_be"
                aDataField = oModel.getProperty("/s_be");
                if(aDataField?.length>0)
                    aKeys = Object.keys(aDataField[0]);
             }
             if(param==="05"){
                aFieldsTable =  aFieldsTable.filter(oField=>oField.KEYTAB==="T05");
                 oService.PROPERTY="/str_hor";
                 aDataField = oModel.getProperty("/str_hor");
                 if(aDataField?.length>0)
                    aKeys = Object.keys(aDataField[0]);        
             }

             if(aKeys?.length>0){
                 i = 0
                 aFieldsTable.forEach(oField=>{
                    oField.BINDTABLE="{DATOSMAESTRO>"+aKeys[i]+"}";
                    i++;       
                 })
             }

             aFieldsTable.forEach((oItem)=>{
                 if(oItem.CONTROLTABLE==="TEXT"&&oItem.ORDENMEW!==1){
                    aCells.push(new sap.m.Text({
                        text:oItem.BINDTABLE
                    }));

                }else if(oItem.CONTROLTABLE==="INPUT"){
                    aCells.push(new sap.m.Input({
                        value:oItem.BINDTABLE,
                        change:function(oEvent){
                            let sValue = oEvent.getParameter("value");
                            this.changeDataTable(oEvent,sValue);
                        }.bind(this)
                    }));
                }else if(oItem.CONTROLTABLE==="COMBOBOX"){
                    let sKey,
                    sText,
                    sPath,
                    oItemTemplate;

                    sKey = `{${oService.MODEL}>id}`;
                    sText = `{${oService.MODEL}>descripcion}`;
                    sPath = oService.MODEL+">/"+oItem.IDFIELD;
                    oItemTemplate = new sap.ui.core.ListItem({
                        key:sKey,
                        text:sText
                    });
                    aCells.push(new sap.m.ComboBox({
                        items: {
                            path: sPath,
                            template: oItemTemplate,
                            templateShareable: false
                        },
                        placeholder:"Seleccione "+oItem.NAMEFIELD,
                        value:oItem.BINDTABLE,
                        change:function(oEvent){
                            // let sValue = oEvent.getParameter("selectedItem").getKey(),
                            // sText = oEvent.getParameter("selectedItem").getText();
                            let sValue = oEvent.getParameter("value");
                            this.changeDataTable(oEvent,sValue);
                        }.bind(this)
                    }))
                }else if(oItem.CONTROLTABLE==="DATE"){
                    aCells.push(new sap.m.DatePicker({
                        displayFormat:"short",
                        value:oItem.BINDTABLE,
                        valueFormat:"dd/MM/yyyy",
                        change:function(oEvent){
                            let sFecha = oEvent.getParameter("value");
                            this.changeDataTable(oEvent,sFecha);
                        }.bind(this)
                    }))
                }else if(oItem.ORDENMEW===1){
                    aCells.push(new sap.m.ObjectStatus({
                        text:oItem.BINDTABLE,
                        state:"Indication06"
                    }))
                }
             });
            let aFields =  oMaster.fields.filter(oField=>oField.CONTROLNEW);
            if(aFields.length>0){
                aCells.push(new sap.m.Button({
                    text:"Editar",
                    icon:"sap-icon://edit",
                    press:function(oEvent){
                        this.onNuevoMaestro(oEvent,param);
                    }.bind(this)
                }));

            }
            let oColumnList = new ColumnListItem({
                cells:aCells,
                type:"Detail",
                press:function(oEvent){
                    // set property navigation
                    this.onNuevoMaestro(oEvent);
                }.bind(this)
            });
            oControl.bindItems(oService.MODEL+">"+oService.PROPERTY,oColumnList);
         },

         changeDataTable:function(oEvent,sValue){
            let oContext = oEvent.getSource().getBindingContext("DATOSMAESTRO"),
            oContextMaster = oEvent.getSource().getBindingContext(),
            oItem = oContext.getObject(),
            oMaster=oContextMaster.getObject(),
            oServiceUpdate = oMaster.services.find(serv=>serv.IDSERVICE==="UPDATE"),
            oModelUpdate = this.getController().getModel(oServiceUpdate.MODEL),
            aParams = oModelUpdate.getProperty("/dataUpdate")||[],
            aFields = oMaster.fields.filter(oField=>oField.CONTROLTABLE),
            sKey,
            sKeyValue,
            sField,
            oParam;

            aFields.forEach(oField=>{
                if(oField.IDFIELD==="CDEMB"||oField.IDFIELD==="PERNR"){
                    sKey = oField.IDFIELD.toLowerCase();
                    sKeyValue = oItem[oField.IDFIELD]
                    // oParam[sKey.toLowerCase()] = sKeyValue;
                }
                if(sValue===oItem[oField.IDFIELD])
                    sField=oField.IDFIELD;
            });
            oParam = aParams.find(param=>param.cdemb===sKeyValue);
            if(!oParam)
                oParam = aParams.find(param=>param.pernr===sKeyValue);
            if(!oParam){
                oParam={};
                oParam[sKey] = sKeyValue;
                aParams.push(oParam);
            }
            if(sValue==="No")
                sValue = "N"
            if(sValue==="Si")
                sValue = "S"
            oParam[sField.toLowerCase()]=sValue;

            oModelUpdate.setProperty("/dataUpdate",aParams);
         },
        
        /**
         * Creacion de campos de busqueda simple
         * @param {array} arrayCampos 
         */

         /**
          * Creacion de controles para busqueda simple
          * @param {*} arrayCampos 
          */
        setCamposBusqueda:function(oMaster,param){
             let oControl=this.getControl(),
             oService = oMaster.services.find(serv=>serv.INITSERVICE==="TRUE"),
             oModel = this.getController().getModel(oService.MODEL),
             oFormContainer = new FormContainer(),
             oFormContainerButton= new FormContainer,
             oFormElement,control,aFields,
             oButtonSearch,oButtonClean;

             aFields = oMaster.fields.filter(oField=>oField.CONTROLSEARCH);
             if(param==="M13"){
                 aFields = aFields.filter(oField=>oField.KEYTAB==="T00"||oField.ORDENMEW<5);
             }
             if(param==="A"){
                 aFields=aFields.filter(oField=>oField.ORDENMEW>4&&oField.KEYPANEL);
             }
             aFields.forEach(oCampo=>{
                oFormElement = new FormElement({label:oCampo.NAMEFIELD});

                control=this.getController().mFields[oCampo.IDFIELD+"0"];
                if(!control){
                    if (oCampo.CONTROLSEARCH==="INPUT/NUMERIC"||oCampo.CONTROLSEARCH==="INPUT"){
                        control=this.buildControlInput(control,oCampo,oMaster,"0");
                    }else if(oCampo.CONTROLSEARCH==="COMBOBOX"){
                        control = this.buildControlCombo(control,oCampo,oService,oModel,"0");
                    }else{
                        control = this.buildDate(control,oCampo)
                    }
                    this.getController().mFields[oCampo.IDFIELD+"0"] = control;
                }
                oFormElement.addField(control);
                // si el input es un rango
                if(oCampo.RANGE==="TRUE"){
                    control=this.getController().mFields[oCampo.IDFIELD+"1"];
                    if(!control){
                        if(oCampo.CONTROLSEARCH==="INPUT/NUMERIC"||oCampo.CONTROLSEARCH==="INPUT"){
                            control= this.buildControlInput(control,oCampo,oMaster,"1");
                        }else if(oCampo.CONTROLSEARCH==="COMBOBOX"){
                            control = this.buildControlCombo(control,oCampo,oService,oModel,"1");
                        }
                        this.getController().mFields[oCampo.IDFIELD+"1"]=control;
                    }
                    oFormElement.addField(control);
                }
                oFormContainer.addFormElement(oFormElement);
             });
             
             oControl.addFormContainer(oFormContainer);

             if(aFields.length>0&&!param||param==="M13"){
                oButtonSearch = new sap.m.Button({
                    text:"Buscar",
                    type:"Emphasized",
                    icon:"sap-icon://search",
                    press:function(oEvent){
                        BusyIndicator.show(0);
                        this.onBusquedaSimple(oEvent);
                    }.bind(this)
                });
                oButtonClean = new sap.m.Button({
                    text:"Limpiar filtros",
                    type:"Ghost",
                    icon:"sap-icon://clear-filter",
                    press:function(oEvent){
                        BusyIndicator.show(0);
                        this.onCleanSearch(oEvent);
                    }.bind(this)
                });
                let oFormElementButtom = new FormElement({
                   label:""
                });
                oFormElementButtom.addField(oButtonSearch);
                oFormElementButtom.addField(oButtonClean);
                oFormContainerButton.addFormElement(oFormElementButtom);
                oControl.addFormContainer(oFormContainerButton)
            }
            
        },

        buildControlInput:function(control,oCampo,oMaster,sId){
            let oModel = this.getController().getModel();
            control = new sap.m.Input(oCampo.IDFIELD+sId,{
                value:"",
                maxLength:oCampo.LENGTH,
                showTableSuggestionValueHelp:false,
                placeholder:"Ingrese "+ oCampo.NAMEFIELD,
                type:oCampo.CONTROLSEARCH.split("/")[1]==="NUMERIC"?"Number":"Text",
                // showValueHelp:oCampo.COMPONENT==="B03",
                valueHelpRequest:function(oEvent){
                    this.showSearchHelp(oEvent);
                }.bind(this)
            });
            control.setShowValueHelp(false)
            if(oCampo.COMPONENT){
                this.buildSuggestion(control,oCampo,oMaster);
                if(oCampo.COMPONENT==="B03"){
                    control.setShowValueHelp(true)
                    if(oMaster.IDAPP==="M22"||oMaster.IDAPP==="M13"){
                        control.bindProperty("value",{
                            parts:[
                                {
                                    path:'/help/CDEMB'
                                },
                                {
                                    path:'/help/NMEMB'
                                }
                            ]
                        });
                        control.bindProperty("description",{
                            path:'/help/NMEMB'
                        })
                    }

                }
            }
            if(oCampo.IDFIELD==="ROWCOUNT") control.setValue(100);
            return control;
        },

        buildControlCombo:function(control,oCampo,oService,oModel,sId){
            let sKey,
            sText,
            sPath,
            oItemTemplate;

            sKey = `{${oService.MODEL}>id}`;
            sText = `{${oService.MODEL}>descripcion}`;
            sPath = oService.MODEL+">/"+oCampo.IDFIELD;
            oItemTemplate = new sap.ui.core.ListItem({
                key:sKey,
                text:sText
            });
            control = new sap.m.ComboBox(oCampo.IDFIELD+sId,{
                items: {
                    path: sPath,
                    template: oItemTemplate,
                    templateShareable: false
                },
                placeholder:"Seleccione "+oCampo.NAMEFIELD,
                // selectedKey:`${oService.MODEL}>/${oCampo.IDFIELD}`
                // selectionChange:function(oEvent){
                //     let skey = oEvent.getParameter("selectedItem").getKey();
                //     oModel.setProperty(`/${oCampo.IDFIELD}`,skey);
                // }.bind(this)
            });
            return control;
        },

        buildSuggestion:function(control,oCampo,oMaster){
            // const app = Data.find(item=>item.idApp==="B01");
            const oModelHelp = this.getController().getModel("AYUDABUSQUEDA"); 
            let aCells=[],
            oCol,
            aDataHelp = oModelHelp.getProperty(`/${oCampo.COMPONENT}`),
            aFieldsName = oModelHelp.getProperty(`/name${oCampo.COMPONENT}`),
            aColumns;

            if(aDataHelp){
                aFieldsName.forEach(campo=>{
                    oCol = new sap.m.Column
                    if(oCol.ORDENMEW!==1){
                        oCol.setDemandPopin(true);
                        oCol.setPopinDisplay("Inline");
                        oCol.setMinScreenWidth("Large");
                    }
                    oCol.setWidth("8rem");
                    oCol.setHeader(new sap.m.Label({text:campo.NAMEFIELD}))
                    control.addSuggestionColumn(oCol);
                    if(campo.CONTROLTABLE==="TEXT"&&campo.ORDENMEW===1){
                        aCells.push(new sap.m.ObjectStatus({
                            text:`{AYUDABUSQUEDA>${campo.IDFIELD}}`,
                            state:"Indication06"
                        }))
                    }else{
                        aCells.push(new sap.m.Text({text:`{AYUDABUSQUEDA>${campo.IDFIELD}}`}))
                    }
                });
    
                const oTemplate = new sap.m.ColumnListItem({
                    cells:aCells
                })
                // const oService = app.services.find(serv=>serv.IDSERVICE==="Table")
                control.bindSuggestionRows("AYUDABUSQUEDA>/"+oCampo.COMPONENT,oTemplate)
                control.setShowSuggestion(true);
                control.setValueState("Information");
                control.setValueStateText("Selecione "+oCampo.NAMEFIELD);
            }
        },

        buildDate:function(control,oCampo,oMaster,sId){
            control = new sap.m.DatePicker(oCampo.IDFIELD+sId,{
                displayFormat:"dd/MM/yyyy"
            });
            if(oCampo.RANGE==="TRUE"){
                control = new sap.m.DateRangeSelection;
            }
            return control;
        },

        showSearchHelp:function(oEvent){
            // this.getController().crearFragments("AyudaBusquedaEmb");
            let that = this, 
            oModelMaster = this.getController().getModel("DATOSMAESTRO"),
            oModel = oEvent.getSource().getBindingContext().getModel();
            // sIdControl = oEvent.getParameter("id");
            // oModelMaster.setProperty("/idControl",sIdControl);
            // let oDialog = new AyudaBusquedaEmb(this.getView());
            // oDialog.open();
            oModel.setProperty("/searchEmbar",{});
            let INPRP = oModelMaster.getProperty("/INPRP");
            oModel.setProperty("/INPRP",INPRP);
            
            let oView = this.getView(),
			sUrl = HOST2 + "/9acc820a-22dc-4d66-8d69-bed5b2789d3c.AyudasBusqueda.busqembarcaciones-1.0.0",
			nameComponent = "busqembarcaciones",
			idComponent = "busqembarcaciones";

			if(!that.DialogComponent){
				that.DialogComponent = new sap.m.Dialog({
					title:"Búsqueda de Embarcaciones",
					icon:"sap-icon://search",
					state:"Information",
					endButton:new sap.m.Button({
						icon:"sap-icon://decline",
						text:"Cerrar",
						type:"Reject",
						press:function(oEvent){
							that.onCloseDialog(oEvent);
						}.bind(that)
					})
				});
				oView.addDependent(that.DialogComponent);
				oModel.setProperty("/idDialogComp",that.DialogComponent.getId());
			}

			let compCreateOk = function(){
				BusyIndicator.hide()
			}
			if(that.DialogComponent.getContent().length===0){
				BusyIndicator.show(0);
				const oContainer = new sap.ui.core.ComponentContainer({
					id: idComponent,
					name: nameComponent,
					url: sUrl,
					settings: {},
					componentData: {},
					propagateModel: true,
					componentCreated: compCreateOk,
					height: '100%',
					// manifest: true,
					async: false
				});
				that.DialogComponent.addContent(oContainer);
			}

			that.DialogComponent.open();
        },

        /**
         * cerrar dialogo de componente de ayuda de busqueda
         * @param {*} oEvent 
         */
        onCloseDialog:function(oEvent){
			oEvent.getSource().getParent().close();
		},
     
        /**
         * Creacion de Formulario nuevo y editar
         * @param {*} arrayCampos 
         */
        setCamposNuevo:function(oMaster,param,param2){
            let oControl=this._oControl,
            oServiceInit = oMaster.services.find(serv=>serv.INITSERVICE==="TRUE"),
            oServiceTable = oMaster.services.find(serv=>serv.IDSERVICE==="TABLE"),
            oFormContainer = new FormContainer(),
            oModel = this.getController().getModel("DATOSMAESTRO"),
            oFormElement={},
            oItemTemplate,
            control,
            sKey,
            sText,
            sPath,
            sBindEdit,
            oButton,
            aFields =  oMaster.fields.filter(oField=>oField.CONTROLNEW);
            // oDataEdit = this.getController().oModelMaestro.getProperty("/editar");
             if(param==="T01"){
                 aFields =  aFields.filter(oField=>oField.KEYTAB===param||oField.KEYTAB==="T00/T01");
                if(param2==="P01"){
                    aFields=aFields.filter(oField=>oField.KEYPANEL===param2);
                }else if(param2==="P02"){
                    aFields=aFields.filter(oField=>oField.KEYPANEL===param2);
                }else if(param2==="P03"){
                    aFields=aFields.filter(oField=>oField.KEYPANEL===param2);
                }else if(param2==="P04"){
                    aFields=aFields.filter(oField=>oField.KEYPANEL===param2);
                }else if(param2==="P05"){
                    aFields=aFields.filter(oField=>oField.KEYPANEL===param2);
                }else if(param2==="P06"){
                    aFields=aFields.filter(oField=>oField.KEYPANEL===param2);
                }
            }else if(param==="T02"){
                aFields =  aFields.filter(oField=>oField.KEYTAB===param);
            }else if(param==="T03"){
                aFields =  aFields.filter(oField=>oField.KEYTAB===param);
            }else if(param==="T04"){
                aFields =  aFields.filter(oField=>oField.KEYTAB===param);
            }else if(param==="T05"){
                aFields =  aFields.filter(oField=>oField.KEYTAB===param);
            }else if(param==="T06"){
                aFields =  aFields.filter(oField=>oField.KEYTAB===param);
            }
            
            aFields.forEach(oCampo=>{
                oFormElement = new FormElement({
                    label:new sap.m.Label({text:oCampo.NAMEFIELD}),
                    fields:[]
                });
                sBindEdit=`${oServiceTable.MODEL}>/${oCampo.IDFIELD}N`
                control = this.getController().mFields[oCampo.IDFIELD+"N"];
                if(!control){
                    if (oCampo.CONTROLNEW==="INPUT"||oCampo.CONTROLNEW==="INPUT/NUMERIC"){
                        control = new sap.m.Input(oCampo.IDFIELD+"N",{
                            value:oCampo.IDFIELD==="CLGFL"?"":`{${sBindEdit}}`,
                            placeholder:"Ingrese "+ oCampo.NAMEFIELD,
                            required:oCampo.REQUIRED==="TRUE",
                            editable:oCampo.READONLY==="TRUE"?false:true,
                            showValueHelp:oCampo.IDFIELD==="CLGFL"||oCampo.COMPONENT==="B03",
                            showTableSuggestionValueHelp:true,
                            suggestionItemSelected:function(oEvent){
                                let oItemSelected = oEvent.getParameter("selectedRow"),
                                sCodPlanta = oItemSelected.getCells()[0].getText(),
                                sCentro = oItemSelected.getCells()[1].getText(),
                                sDesc;
                                if(oItemSelected.getCells().length>2){
                                    sDesc = oItemSelected.getCells()[2].getText();
                                }
                                oEvent.getSource().setDescription(sDesc||sCentro);
                                if(oCampo.IDFIELD==="CDPTA"){
                                    let oFieldCenter = this.getController().mFields["WERKSN"];
                                    oFieldCenter.setValue(sCentro);
                                }
                            }.bind(this),
                            valueHelpRequest:function(oEvent){
                                if(oEvent.getParameter("id")==="CDEMBN") this.openValueHelpNew(oEvent);
                                if(oEvent.getParameter("id")==="CLGFLN") this.showSearchHelpColor(oEvent);
                            }.bind(this),
                            type:oCampo.CONTROLNEW==="INPUT/NUMERIC"?"Number":"Text"
                        });
                        if(oCampo.COMPONENT){
                            this.buildSuggestion(control,oCampo,oMaster);
                        }
                    }else if(oCampo.CONTROLNEW==="COMBOBOX"){
                            sKey = `{${oServiceInit.MODEL}>id}`;
                            sText = `{${oServiceInit.MODEL}>descripcion}`;
                            sPath = oServiceInit.MODEL+">/"+oCampo.IDFIELD;
                            // sPath = `${oService.model}>/${oCampo.bindSearchAdv}`
                        // }
                        oItemTemplate = new sap.ui.core.ListItem({
                            key:sKey,
                            text:sText
                        });
                        control = new sap.m.ComboBox(oCampo.IDFIELD+"N",{
                            placeholder:"Ingrese "+ oCampo.NAMEFIELD,
                            value:`{${sBindEdit}}`,
                            required:oCampo.REQUIRED==="TRUE",
                            items: {
                                path: sPath,
                                template: oItemTemplate,
                                templateShareable: false
                            },
                            selectionChange:function(oEvent){
                                let skey = oEvent.getParameter("selectedItem").getKey();
                                oModel.setProperty(`/${oCampo.IDFIELD}NC`,skey);
                            }.bind(this)
                        })
                    }else if(oCampo.CONTROLNEW==="DATE"){
                        control = new sap.m.DatePicker(oCampo.IDFIELD+"N",{
                            displayFormat:"dd/MM/yyyy"
                        })
                    }else if(oCampo.CONTROLNEW==="CHECKBOX"){
                        control = new sap.m.CheckBox(oCampo.IDFIELD+"N",{
                            // selected=sBindEdit,
                            select:function(oEvent){
                                console.log(oEvent)
                            }.bind(this)
                        });
                    }
                    this.getController().mFields[oCampo.IDFIELD+"N"]=control;
                };
                // control.bindProperty("value",sBindEdit);
                oFormElement.addField(control);
                
                oFormContainer.addFormElement(oFormElement);

            });
            oControl.addFormContainer(oFormContainer);
        },

        showSearchHelpColor:function(oEvent){
            this.inputId = oEvent.getSource().getId();
			if (!this.oColorPickerPopover) {
				this.oColorPickerPopover = new ColorPickerPopover("oColorPickerPopover", {
					colorString: "pink",
					displayMode: ColorPickerDisplayMode.Simplified,
					mode: ColorPickerMode.HSL,
					change: this.handleChangeColor.bind(this)
				});
			}
			this.oColorPickerPopover.openBy(oEvent.getSource());
        },

        handleChangeColor:function(oEvent){
			let oInput = this.getController().mFields[this.inputId];

			oInput.setValue(oEvent.getParameter("colorString"));
			oInput.setValueState(ValueState.None);
			this.inputId = "";
        },

        /**
         * Contenido para Embarcacion: Tab General
         */

         /**
          * 
          * @param {aItemsTabBar} aItemsTabBar 
          */
         setIconTabBar:function(aItemsTabBar){
            let oControl=this._oControl, 
            oIconTabBar = new IconTabBar({
                select:function(oEvent){
                    this.onFilterSelect(oEvent);
                }.bind(this)
            }),
            oItemTab;
            aItemsTabBar.forEach((oItem=>{
                oItemTab=new sap.m.IconTabFilter({
                    key : oItem.key,
                    text : oItem.text,
                    icon : oItem.icon,
                    iconColor : oItem.iconColor
                })
                oIconTabBar.addItem(oItemTab);
                oIconTabBar.addContent();
            }));
            oControl.addContent(oIconTabBar);
         },

         /**
          * Eventos para tabla / Generar un nuevo registro o Editar un registro
          * @param {*} oEvent 
          */

         onNuevoMaestro:function(oEvent,param){
             let oContext = this.getControl().getBindingContext(),
             oContextData = oEvent.getSource().getBindingContext("DATOSMAESTRO"),
             oDataMaster=oContextData?.getObject(),
             oMaster = oContext.getObject(),
             oModel = this.getController().getModel("DATOSMAESTRO"),
             aFields=oMaster.fields.filter(oField=>oField.CONTROLNEW),
             sTypeDialog=oContextData?"editar":"nuevo";

             if(oMaster.IDAPP==="M22") {
                 this.showDialogHist();
                 return;
             }
             oModel.setProperty("/sTypeDialog",sTypeDialog);
             oModel.setProperty("/master",oMaster);
             aFields.forEach(oField=>{
                if(!oDataMaster){
                    oModel.setProperty(`/${oField.IDFIELD}N`,"")
                }else{
                    oModel.setProperty(`/${oField.IDFIELD}N`,oDataMaster[oField.IDFIELD]);  
                }
             });
             let oFieldEmb = aFields.find(oField=>oField.IDFIELD==="CDEMB"&&oField.ORDENMEW===1),
             aParams=["s_ps","s_pe","s_ee","s_be","str_hor"];
            //  aParams.forEach(item=>oModel.setProperty(`/${item}`,[]))
            oModel.setProperty(`/s_pe`,[{}])
             if(oContextData&&param!=="M13"){
                param = oContextData.getPath().split("/")[1];
                param = aParams.find(item=>item===param);
             }
             if(oFieldEmb&&oContextData&&param==="M13"){
                this.getController().getEmbarcAdicional(oMaster,oDataMaster[oFieldEmb.IDFIELD]);
             }
             if(param&&param!=="M13"){
                 this.onEditarEmbarcacion(param,oContextData);
             }else{
                 this.getController().crearFormNuevo(oMaster,oDataMaster);
             }

         },


         /**
          * Metodos para Historico de competencia
          */
         showDialogHist:function(){
            let oDialogHistCompt = this.getController().mFragments["HistCompetencia"];
            if(!oDialogHistCompt){
                oDialogHistCompt=Fragment.load({
                    name:"com.tasa.maestros.fragments.histoCompetencia.selectHist",
                    controller:this
                }).then(oDialog=>{
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
                this.getController().mFragments["HistCompetencia"]=oDialogHistCompt;
            };
            oDialogHistCompt.then(oDialog=>{
                oDialog.open();
            })
         },

         closeDialogEdit:function(oEvent){
            oEvent.getSource().getParent().close();
         },

         onSaveHistCompet:function(oEvent){
            BusyIndicator.show(0);
            let oContext = oEvent.getSource().getBindingContext(),
            oMaster = oContext.getObject(),
            oService = oMaster.services.find(oServ=>oServ["IDSERVICE"]==="CARGAMASIV"), 
            oModelMaster  = this.getController().getModel(oService.MODEL),
            sCodigo = oModelMaster.getProperty("/keyHist");

            if(!sCodigo){
                this.getController().getMessageDialog("Warning","Seleccione una temporada");
                return;
            } 

            oService.param = new Object();
            oService.param.p_cdpcn = sCodigo;

            this.getController().cargaMasivaHisto(oService);
            this.closeDialogEdit(oEvent);
            oModelMaster.setProperty("/keyHist","");
            oModelMaster.setProperty("/descHist","");
         },

         onSelectionHistCompet:function(oEvent){
            let sDesc = oEvent.getSource().getSelectedItem().getText(),
            oModelMaster = this.getController().getModel("DATOSMAESTRO");
            oModelMaster.setProperty("/descHist",sDesc)
         },

        /**
         *  Guardar registro de popup Nuevo y Editar
         * @param {*} oEvent 
         */
         onSaveNew:function(oEvent){
             let oMessageWarning = this.getMessageWarning("¿Esta seguro de que desea guardar?"),
             oModel = this.getController().getModel();
             // this.close();
         },

         getMessageWarning:function(sMessage){
			let oMessageDialog;
			if (!oMessageDialog) {
				oMessageDialog = new sap.m.Dialog({
					type: sap.m.DialogType.Message,
					title: "Advertencia",
					state: "Warning",
					content: new sap.m.Text({ text: sMessage }),
					beginButton: new sap.m.Button({
						type: sap.m.ButtonType.Emphasized,
						text: "OK",
						press: function (oEvent) {
							// BusyIndicator.show(0);
							this._saveNewEdit(oEvent)
							oMessageDialog.close();
						}.bind(this)
					}),
					endButton: new sap.m.Button({
						type: sap.m.ButtonType.Rejected,
						text: "Cancelar",
						press: function () {
							// BusyIndicator.show(0);
							oMessageDialog.close();
						}.bind(this)
					})
				});

                this.getView().addDependent(oMessageDialog);
			}
			oMessageDialog.open();
		},
            
         _saveNewEdit:function(oEvent){
             BusyIndicator.show(0);
            let oMaster = oEvent.getSource().getBindingContext().getObject(),
             oModelMaster = this.getController().getModel("DATOSMAESTRO"),
             serv = oMaster.services.find(oServ=>oServ.IDSERVICE==="UPDATE"),
             sCase = oModelMaster.getProperty("/sTypeDialog"),
             aNewFields = oMaster.fields.filter(oField=>oField.CONTROLNEW),
             sFieldWhere,
             sValue,
             sKeyWhere,
             oOption={},
             aOption=[],
             oControl;
             if(oMaster.IDAPP==="M13"){
                 let aEmbarcacion = this.getDataEmbarcacion(oMaster.fields,oModelMaster),
                 aPermPescaEmbar = this.getDataPescaEmbar(oModelMaster),
                 aPermPescaEspec = this.getDataPescaEspec(oModelMaster),
                 aEquipamiento = this.getDataEquip(oModelMaster),
                 aBodegas = this.getDataBodegas(oModelMaster),
                 aHorometros = this.getDataHorometros(oModelMaster);
                 
                 serv.param={
                    params:{
                        p_case:sCase==="nuevo"?"N":"E",
                        p_code:sCase!=="nuevo"?oModelMaster.getProperty("/codEmbar"):"",
                        p_user:"FGARCIA"
                    },
                    s_bpe:      aBodegas,
                    s_emb:      aEmbarcacion,
                    s_epe:      aEquipamiento,
                    s_pec:      aPermPescaEspec,
                    s_ppe:      aPermPescaEmbar,
                    str_hor:    aHorometros
                 };
                 
                 this.getController()._updateEmbarcacion(serv)
             }else{

                 for (let index = 0; index < aNewFields.length; index++) {
                     const oField = aNewFields[index];
                     oControl = this.getController().mFields[oField.IDFIELD+"N"];
                    sValue = oModelMaster.getProperty(`/${oField.IDFIELD}N`);
                    if(oField.CONTROLNEW==="COMBOBOX"){
                        if(oControl.getSelectedKey()!==""){
                            sValue=oControl.getSelectedKey();
                        }else{
                            let aData = oModelMaster.getProperty(`/${oField.IDFIELD}`),
                            oItem = aData.find(item=>item.descripcion===sValue);
                            sValue = oItem?.id;
                            if(!sValue) sValue = "";
                        }
                    }
                    if(oField.ORDENMEW===1){
                        sFieldWhere = oField.IDFIELD
                        sKeyWhere = sValue
                    }
                    if(oField.CONTROLNEW&&oField.READONLY==="FALSE"){
                        oOption={
                            field:oField.IDFIELD,
                            valor:sValue
                        }
                        aOption.push(oOption);
                    }
                    if(oField.REQUIRED==="TRUE"&&sValue===""&&oField.READONLY==="FALSE"){
                        this.getController().getMessageDialog("Error","Ingrese el campo "+oField.NAMEFIELD)
                        BusyIndicator.hide();
                        return;
                    }
                    sValue = ""; 
                 }
                // oMaster.fields.forEach(oField=>{
                //     oControl = this.getController().mFields[oField.IDFIELD+"N"];
                //     sValue = oModelMaster.getProperty(`/${oField.IDFIELD}N`);
                //     if(oField.CONTROLNEW==="COMBOBOX"){
                //         if(oControl.getSelectedKey()!==""){
                //             sValue=oControl.getSelectedKey();
                //         }else{
                //             let aData = oModelMaster.getProperty(`/${oField.IDFIELD}`),
                //             oItem = aData.find(item=>item.descripcion===sValue);
                //             sValue = oItem?.id;
                //         }
                //     }
                //     if(oField.ORDENMEW===1){
                //         sFieldWhere = oField.IDFIELD
                //         sKeyWhere = sValue
                //     }
                //     if(oField.CONTROLNEW&&oField.READONLY==="FALSE"){
                //         oOption={
                //             field:oField.IDFIELD,
                //             valor:sValue
                //         }
                //         aOption.push(oOption); 
                //     }
                //     if(oField.REQUIRED==="TRUE"&&sValue===""){
                //         this.getController().getMessageDialog("Error","Ingrese el campo"+oField.NAMEFIELD)
                //         return;
                //     }
                // });
                    
                serv.param={
                    data: "",
                    fieldWhere: sKeyWhere?sFieldWhere:"",
                    flag: "X",
                    keyWhere: sKeyWhere,
                    opcion: aOption,
                    p_case: sCase==="nuevo"?"N":"E",
                    p_user: "FGARCIA",
                    tabla: serv.TABLA
                };
                this.getController()._updateService(serv,oMaster);
            }
         },

         /**
          *  Metdos Auxiliares para guardar embarcaciones
          * @param {Array} aFields 
          * @param {object} oModelMaster 
          * @returns 
          */
         getDataEmbarcacion:function(aFields,oModelMaster){
             let aOption=[],
             aDataFields=aFields.filter(oField=>oField.KEYTAB==="T00/T01"||oField.KEYTAB==="T01"),
             sKey,
             oControl,
             oOption={},
             sValue;

            aDataFields.forEach(oField=>{
                
                oControl = this.getController().mFields[`${oField.IDFIELD}N`]
                sKey = oField.IDFIELD;
                sValue = oModelMaster.getProperty(`/${oField.IDFIELD}N`);
                if(oField.CONTROLNEW==="INPUT"){
                }else if(oField.CONTROLNEW==="COMBOBOX"){
                    sValue = oControl.getSelectedKey()
                }else if(oField.CONTROLNEW==="DATE"){
                    if(!sValue) sValue = oControl.getValue();
                    if(sValue) {
                        let sfecha = sValue.split("/")[1]+"/"+sValue.split("/")[0]+"/"+sValue.split("/")[2];
                        sfecha = new Date(sfecha);
                        sValue = this.getController().paramDate(sfecha)
                    }
                }
                // oOption[oField.IDFIELD]=sValue;
                // oOption.sKey=sValue;
                oOption[sKey]=sValue
            });
            aOption.push(oOption);
            return aOption;
         },

         getDataPescaEmbar:function(oModelMaster){
            let aPermPescaEmbar = oModelMaster.getProperty("/s_pe")||[],
            sFechaI ,
            sFechaF;
             
            //  aPermPescaEmbar = [];
            aPermPescaEmbar.forEach(item=>{
               delete item.MANDT
               delete item.ESPSU
               
               sFechaI = item.FIPMS||"";
               sFechaF = item.FFPMS||"";
               if(sFechaI) {
                   sFechaI = sFechaI.split("/")[1]+"/"+sFechaI.split("/")[0]+"/"+sFechaI.split("/")[2];
                   sFechaI = new Date(sFechaI);
                   item.FIPMS = this.getController().paramDate(sFechaI)
                }
                if(sFechaF){
                    sFechaF = sFechaF.split("/")[1]+"/"+sFechaF.split("/")[0]+"/"+sFechaF.split("/")[2];
                    sFechaF = new Date(sFechaF);
                    item.FFPMS = this.getController().paramDate(sFechaF)
                } 
              })
            return aPermPescaEmbar;
         },

         getDataPescaEspec:function(oModelMaster){
            let aData = oModelMaster.getProperty("/s_ps")||[];
            aData.forEach(item=>{
                delete item.DESC_CDTPC
                delete item.MANDT
                delete item.DSSPC;
            });
            return aData;
         },

         getDataEquip:function(oModelMaster){
            let aData = oModelMaster.getProperty("/s_ee")||[];
            aData.forEach(item=>{
                delete item.DSUMD;
                delete item.DSEQP;
                delete item.CDEQP;
            });
            return aData;
         },

         getDataBodegas:function(oModelMaster){
            let aData = oModelMaster.getProperty("/s_be")||[];
            aData.forEach(item=>{
                delete item.DSBOD;
                // delete item.DSEQP;
                // delete item.CDEQP;
            });
            return aData;
         },

         getDataHorometros:function(oModelMaster){
            let aData = oModelMaster.getProperty("/str_hor")||[];
            aData.forEach(item=>{
                delete item.MANDT
                delete item.DESC_ESREG;
                delete item.EQKTX;
                delete item.CDEMB;
            });
            return aData;
         },
         

        /**
         * evento para toolbar de tabla
         * @param {*} oEvent 
         */
        onSearchFilter:function(oEvent){
            let oMaster = oEvent.getSource().getBindingContext().getObject(),
            aColumns = oMaster.fields.filter(oField=>oField.CONTROLTABLE),
            filter,oFilter;

            // add filter for search
			const aFilters = [];
			let sQuery = oEvent.getSource().getValue();
			if (sQuery && sQuery.length > 0) {
                aColumns.forEach(oCol=>{
                    filter = new Filter(
                        oCol.IDFIELD,
                        FilterOperator.Contains,
                        sQuery
                    );
                    aFilters.push(filter);
                })
                aFilters.push(filter);

                oFilter = new Filter({
                    filters:aFilters,
                    and:false
                })
			}

			// update list binding
			const oTable = oEvent.getSource().getParent().getParent();
			let oBinding = oTable.getBinding("items");
			oBinding.filter(oFilter, "Application");
        },

        onExportar:function(oEvent){
            let oMaster=oEvent.getSource().getBindingContext().getObject(),
            oService = oMaster.services.find(oServ=>oServ.IDSERVICE==="TABLE"),
            aFields = oMaster.fields.filter(oField=>oField.CONTROLTABLE),
            aColumns=this.createColumnsExport(aFields),
            oTable=this.getView().byId("lineItemsList"),
            aItems = oTable.getModel(oService.MODEL).getProperty(oService.PROPERTY);
            if(!aItems){
                let sMessage = "No hay datos para exportar",
                sTypeDialog="Warning"
                this.getController().getMessageDialog(sTypeDialog,sMessage);
                return;
            }
            // oRowBinding=oTable.getBinding('items'),
            let oSettings = {
				workbook: { columns: aColumns },
				dataSource: aItems,
				fileName: `${oMaster.NAMEAPP}.xlsx`,
				worker: false 
			},
            oSheet = new Spreadsheet(oSettings);
			oSheet.build().finally(function() {
				oSheet.destroy();
			});
        },

        createColumnsExport:function(aFields){
            let aColumnsExport = aFields.map(oCol=>{
                return {
                    label:oCol.NAMEFIELD,
                    property:oCol.IDFIELD
                }
            });
            return aColumnsExport;
        },

        /**
         * Eventos para Formulario basico
         */
        onBusquedaSimple:function(oEvent){
             let oContext = this._oControl.getBindingContext(),
             oMaestro = oContext.getObject(),
            //  oService = oMaestro.services.find(serv=>serv.TIPOPARAM==="PARAM"),
             oService = oMaestro.services.find(serv=>serv.IDSERVICE==="TABLE"&&serv.INITSERVICE==="FALSE"||serv.IDSERVICE==="TABLE"),
             oModelMaster=this.getController().getModel(oService.MODEL),
             sValueLow,sValueHigh="",control;

            oService.param={};
            oService.param.delimitador=oService.DELIMITADOR;
            oService.param.fields=[];
            oService.param.no_data=oService.NO_DATA;
            oService.param.option=[];
            oService.param.options=[];
            oService.param.order=oService.ORDER_S;
            oService.param.p_user="FGARCIA";
            oService.param.rowcount=oService.ROWCOUNT_S
            oService.param.rowskips=oService.ROWSKIPS;
            oService.param.tabla=oService.TABLA;
            
            oMaestro.fields.forEach(oField=>{
                oService.param.fields.push(oField.IDFIELD)
            });

            let aDataFields = oMaestro.fields.filter(oField=>oField.CONTROLSEARCH);

            aDataFields.forEach(oField=>{
                control=this.getController().mFields[oField.IDFIELD+"0"];
                if(oField.CONTROLSEARCH==="INPUT"||oField.CONTROLSEARCH==="INPUT/NUMERIC"){
                    sValueLow = control.getValue();
                }else if(oField.CONTROLSEARCH==="COMBOBOX"){
                    sValueLow=control.getSelectedKey();
                }else if(oField.CONTROLSEARCH==="DATE"){
                    if(control.getValue()){
                        let sValue = control.getValue();
                        sValue = sValue.split("/")[1]+"/"+sValue.split("/")[0]+"/"+sValue.split("/")[2]
                        let oDate = new Date(sValue);
                        sValueLow = this.getController().paramDate(oDate) ;
                    }else{
                        sValueLow = "";
                    }
                }
                if(oField.RANGE==="TRUE"){
                    control=this.getController().mFields[oField.IDFIELD+"1"];
                    sValueHigh = control.getValue();
                }
                if(sValueLow!==""||sValueHigh!==""){
                    if(oField.IDFIELD==="ROWCOUNT"){
                        oService.param.rowcount=sValueLow
                    }else{
                        let oControl = oField.CONTROLSEARCH;
                        if(oField.RANGE==="TRUE")
                            oControl="MULTIINPUT";
                        oService.param.options.push(
                            {
                                key:oField.IDFIELD,
                                valueLow:sValueLow,
                                valueHigh:sValueHigh,
                                control:oControl,
                                cantidad:oField.LENGTH
                            }
                        )
                        
                    }
                }

                sValueLow = "";
                sValueHigh = "";
            });
            this.getController()._getReadTable(oService,oMaestro);
            oModelMaster.setProperty("/serviceBusqueda",oService);
            // this.getView().getController()._getReadtable();
            // oService.param.options=[]
        },

        onCleanSearch:function(oEvent){
            this.getController().cleanForm(oEvent);
        },

        /**
         * Eventos para Embarcaciones
         */
        
        onFilterSelect:function(oEvent){
             let oContext = oEvent.getSource().getBindingContext(),
             oMaestro = oContext.getObject(),
             sSelectedKey=oEvent.getParameter("selectedKey"),
             oIconTabBar=oEvent.getSource(),
             aContentTab=oIconTabBar.removeAllContent(),
             aForms,
             aFormContainers,
             oTable;
             if(aContentTab.length>2){
                aContentTab.forEach(content=>{
                    aForms=content.removeAllContent();
                    aForms.forEach(form=>{
                        aFormContainers=form.removeAllFormContainers();
                        aFormContainers.forEach(element=>element.removeAllFormElements())
                    })
                })
             }else if(aContentTab.length===2){
                // aFormContainers=aContentTab[0].removeAllFormContainers();
                // aFormContainers.forEach(element=>element.removeAllFormElements());
                // oTable=aContentTab[1].removeAllColumns();
             }else{
                // aFormContainers=aContentTab[0].removeAllFormContainers();
                // aFormContainers.forEach(element=>element.removeAllFormElements());
             }
             this.changeFilterTab(oIconTabBar,sSelectedKey,oMaestro);
        },

        changeFilterTab:function(oIconTabBar,sSelectedKey,oMaestro){
            let oForm ,
            oTable;
            if(sSelectedKey!=="01"&&sSelectedKey!=="06"){
                if(sSelectedKey==="02"){
                    oForm = this.getController().mFragEdit["FormPermisos"];
                    if(!oForm){
                        this.getController().setFragEmb("FormPermisos");
                        oForm = this.getController().mFragEdit["FormPermisos"];
                    }
                    oTable=this.getController().mFragEdit["TablaPermisos"];
                    if(!oTable){
                        this.getController().setFragEmb("TablaPermisos");
                        oTable=this.getController().mFragEdit["TablaPermisos"];
                    }
                    oIconTabBar.addContent(oForm.getControl());
                }
                if(sSelectedKey==="03"){
                    oTable=this.getController().mFragEdit["TablaEquip"];
                    if(!oTable){
                        this.getController().setFragEmb("TablaEquip");
                        oTable=this.getController().mFragEdit["TablaEquip"];
                    }
                }
                       
                if(sSelectedKey==="04"){
                    oTable=this.getController().mFragEdit["TablaBodegas"];
                    if(!oTable){
                        this.getController().setFragEmb("TablaBodegas");
                        oTable=this.getController().mFragEdit["TablaBodegas"];
                    }
                }
                if(sSelectedKey==="05"){
                    oTable=this.getController().mFragEdit["TablaHorom"];
                    if(!oTable){
                        this.getController().setFragEmb("TablaHorom");
                        oTable=this.getController().mFragEdit["TablaHorom"];
                    }
                }
                oIconTabBar.addContent(oTable.getControl());

           }else {
                if(sSelectedKey==="06"){
                    oForm = this.getController().mFragEdit["FormImages"];
                    if(!oForm){
                        this.getController().setFragEmb("FormImages");
                        oForm = this.getController().mFragEdit["FormImages"];
                    }
                    oIconTabBar.addContent(oForm.getControl());
                }else{
                    this.getController().crearFormNuevo(oMaestro,null,sSelectedKey);
                }
           }
        }
    });
},/* bExport= */ true);