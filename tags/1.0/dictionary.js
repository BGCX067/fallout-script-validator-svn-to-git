/*This file contains definitions of keywords and functions used in Fallout 3's scripting language.  These definitions are part of the Fallout 3 script validator available at http://www.cipscis.com/fallout/utilities/validator.aspx
Copyright (C) 2010 Mark Hanna, a.k.a. Cipscis

This code is free software: you can redistribute it and/or modify it under the terms of the GNU General Public LIcense as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This code is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

See http://www.gnu.org/licenses/ for a copy of the GNU General Public License*/



function combineObjects(objectArray)
{
	var output = {};
	for (var i in objectArray) {
		for (var j in objectArray[i])
			output[j] = objectArray[i][j];
	}
	return output;
}

function variable(varName, type)
{
	this.varName = varName;

	this.type = type;
	//Accepted values:
	//"ref"		- FormID
	//"int"		- Integer
	//"float"	- Floating point value

	this.sets = 0;
	//Incremented whenever the variable is assigned a value

	this.checks = 0;
	//Incremented whenever the variable's value is checked
}

function editorID(type)
{
	this.type = type;
}

function blocktype(scriptType, names)
{
	this.scriptType = scriptType;
	this.docLink = names.docLink == undefined ? "" : names.docLink;
	this.name = names.name == undefined ? "" : names.name
	//Binary flags
	//1 = Result
	//2 = Quest
	//4 = Object
	//8 = Effect
}

function scriptFunction(returnType, callingConvention, FOSE, params, names, notes)
{
	if (returnType != undefined)
		this.returnType = returnType;

	if (callingConvention in {"R": 1, "S": 1, "E": 1, "B" : 1, "D": 1})
		this.callingConvention = callingConvention;
	//Accepted values:
	//"R"		- Called on a reference
	//"S"		- Reference function that should always be called implicitly
	//"E"		- Called on reference or on base form specified as final parameter - FOSE functions only
	//"B"		- Not called on a reference.  A base form may be specified as a parameter
	//"D"		- The function is deprecated and should not be called in any way

	if (FOSE != undefined)
		this.FOSE = FOSE;
	//The required version of FOSE
	//Use 0 for functions that don't require FOSE
	//Otherwise use (for example) 1.22 for 1.2 beta 2

	if (params != undefined)
		this.params = params;
	//Should be an array of scriptFunctionParams

	if (names != undefined) {
		//The "names" parameter should be an object with all of the relevant properties used below
		this.docLink = names.docLink;
		this.name = names.name;
		this.shortName = names.shortName;
		this.longName = names.longName;
	}


	if (notes != undefined)
		this.notes = notes;
	//Should be an array of scriptFunctionNotes
}

function alias(functionDef) {return new scriptFunction(functionDef.returnType, functionDef.callingConvention, functionDef.FOSE, functionDef.params, {docLink: functionDef.docLink, name: functionDef.shortName, shortName: functionDef.shortName, longName: functionDef.longName}, functionDef.notes);}

function scriptFunctionParam(dataType, name, optional, values, deprecated)
{
	this.dataType = dataType;
	//Accepted values:
	//"ref"		- FormID
	//"int"		- Integer
	//"float"	- Floating point value
	//"string"	- String literal
	//"void"	- Accepts any value

	//Note: Add proper support for FOSE's format strings and other specific strings like actor values

	this.name = name;
	this.optional = optional != undefined && optional != false; //False unless included, otherwise true

	this.values = values != undefined ? values : false; //False unless included, otherwise as specified
	this.deprecated = deprecated != undefined && deprecated != false; //False unless included, otherwise true
}

function scriptFunctionNote(condition, content, level)
{
	this.condition = condition;
	//An anonymous function that takes an array containing the calling reference (possibly null) and the function's parameters, and returns true or false.  The note's content will be displayed if this function returns true

	this.content = content;
	//A string to be displayed as a warning or error

	this.level = level;
	//Accepted values:
	//0		- Warning
	//1		- Error
}



//Dictionary begins here

dictionary = {
	keywords: {},
	blocktypes: {},
	values: {},
	functions: {}
}

//Keywords
{
	dictionary.keywords["to"] = {type: "2", name: "to"};

	dictionary.keywords["return"] = {
		type: "2",
		name: "Return",
		non_contextual_errors: []
	}

	dictionary.keywords["return"].non_contextual_errors[""] = /^(;(.*))?$/;
	dictionary.keywords["return"].non_contextual_errors["Condition not allowed"] = /^[^;]+(;(.*))?$/;

	dictionary.keywords["scriptname"] = {
		type: "1",
		name: "ScriptName",
		longName: "ScriptName",
		shortName: "scn",
		non_contextual_errors: []
	}

	dictionary.keywords["scriptname"].non_contextual_errors[""] = /^([^\d\W]\w*)\s*(;(.*))?$/;
	dictionary.keywords["scriptname"].non_contextual_errors["EditorID missing"] = /^(;(.*))?$/;
	dictionary.keywords["scriptname"].non_contextual_errors["Multiple editorIDs"] = /^[^\s;]+(\s+[^\s;]+)+\s*(;(.*))?$/;
	dictionary.keywords["scriptname"].non_contextual_errors["EditorID starts with a number"] = /^\d\w*\s*(;(.*))?$/;
	dictionary.keywords["scriptname"].non_contextual_errors["EditorID contains invalid character"] = /^(\w*[^\s\w;])+\w*\s*(;(.*))?$/;

	dictionary.keywords["scriptname"].contextual_validate = function(script)
	{
		switch (script.hasScriptName) {
			//0 - No ScriptName
			//1 - Has ScriptName
			//2 - Has valid code but no ScriptName
		case 1:
			script.pushError("Script already has a ScriptName declaration");
			break;
		case 2:
			script.pushError("ScriptName declaration must take place before any valid code");
			//Don't use break so hasScriptName still changes
		default:
			script.hasScriptName = 1;
		}

		if (script.scriptType & 1) //Result
			script.scriptType--;

		if (script.isValid == true) { //Valid ScriptName present
			var scriptName = script.input[script.lineNumber].match(/^\s*\w+\s+(\w+)/);
			if (scriptName != null)
				scriptName = scriptName[1];
			else
				return;

			if (!(scriptName.toLowerCase() in script.editorIDs)) {
				if (scriptName.toLowerCase() in script.variables["#local"] || scriptName.toLowerCase() in script.variables["#global"])
					script.pushError("\"" + scriptName + "\" is a variable name, so cannot be used as an editorID");
				else if (scriptName.toLowerCase() in dictionary.keywords)
					script.pushError("\"" + scriptName + "\" is a keyword");
				else if (scriptName.toLowerCase() in dictionary.functions)
					script.pushError("\"" + scriptName + "\" is a function");
				else
					script.editorIDs[scriptName.toLowerCase()] = new editorID("SCPT");
			}
		}
	}

	dictionary.keywords["scn"] = {
		type: "1",
		name: "scn",
		longName: "ScriptName",
		shortName: "scn",
		non_contextual_errors: dictionary.keywords["scriptname"].non_contextual_errors,
		contextual_validate: dictionary.keywords["scriptname"].contextual_validate
	}

	dictionary.keywords["begin"] = {
		type: "1",
		name: "Begin",
		non_contextual_errors: []
	}

	dictionary.keywords["begin"].non_contextual_errors[""] = /^[^\s;]+(\s+[^\s;]+)*\s*(;(.*))?$/;
	dictionary.keywords["begin"].non_contextual_errors["Blocktype missing"] = /^(;(.*))?$/;

	dictionary.keywords["begin"].contextual_validate = function(script)
	{
		if (script.inBlock != "") {
			script.pushError("Begin statement illegal within Begin/End block");
			if (script.conditionalLevel) {
				script.pushError(script.conditionalLevel + " endif statement" + (script.conditionalLevel > 1 ? "s" : "") + " missing in block " + script.blockNumber);
				script.conditionalLevel = 0;
			}
		}

		script.indentIncrement = -1;

		var blocktype = script.input[script.lineNumber].match(/^\s*begin\s+(\w+)/i);
		blocktype = blocktype == null ? "unknown" : blocktype[1].toLowerCase();
		script.inBlock = blocktype;

		if (script.isValid == true) {//Potentially valid blocktype present
			if (!(blocktype in dictionary.blocktypes))
				script.pushError("Invalid blocktype");
			else {
				var availableScriptTypes = 14 & dictionary.blocktypes[blocktype].scriptType; //14 - all types but result
				if (script.scriptType & availableScriptTypes)
					script.scriptType &= availableScriptTypes
				else
					script.pushError("Blocktype invalid for this type of script");
			}
		}

		if (script.scriptType & 1) //Result
			script.scriptType--;

		script.blockNumber++;
	}

	dictionary.keywords["end"] = {
		type: "1",
		name: "End",
		non_contextual_errors: []
	}

	dictionary.keywords["end"].non_contextual_errors[""] = /^(;(.*))?$/;
	dictionary.keywords["end"].non_contextual_errors["Condition not allowed"] = /^[^;]+(;(.*))?$/;

	dictionary.keywords["end"].contextual_validate = function(script)
	{
		if (script.inBlock == "")
			script.pushError("End statement illegal outside Begin/End block");
		else
			script.inBlock = "";

		if (script.conditionalLevel) {
			script.pushError(script.conditionalLevel + " endif statement" + (script.conditionalLevel > 1 ? "s" : "") + " missing");
			script.conditionalLevel = 0;
		}

		if (script.scriptType & 1) //Result
			script.scriptType--;
	}

	dictionary.keywords["if"] = {
		type: "1",
		name: "if",
		non_contextual_errors: []
	}

	dictionary.keywords["if"].non_contextual_errors[""] = /^[^;]+(;(.*))?$/;
	dictionary.keywords["if"].non_contextual_errors["Condition missing"] = /^(;(.*))?$/;

	dictionary.keywords["if"].contextual_validate = function(script)
	{
		script.conditionalLevel++;
		script.indentIncrement = -1;

		script.elseDone[script.conditionalLevel] = 0;

		if (script.conditionalLevel > 10)
			script.pushError("Too many nested if statements");

		if (script.isValid == true)
			validateExpression(script.input[script.lineNumber].replace(/^\s*if\s*/i, "").match(/^([^\s]*(\s*([^"';\s]*|"[^"]*?"|'[^']*?'))*)\s*(;(.*))?$/)[1]);
	}

	dictionary.keywords["elseif"] = {
		type: "1",
		name: "elseif",
		non_contextual_errors: dictionary.keywords["if"].non_contextual_errors
	}

	dictionary.keywords["elseif"].contextual_validate = function(script)
	{
		if (script.conditionalLevel)
			script.indentIncrement = -1;
		else {
			script.conditionalLevel = 1;
			script.pushError("elseif statement invalid without preceeding if statement");
		}

		if (script.elseDone[script.conditionalLevel])
			script.pushError("elseif statement invalid after else statement on line " + script.elseDone[script.conditionalLevel]);

		if (script.isValid == true)
			validateExpression(script.input[script.lineNumber].replace(/^\s*elseif\s*/i, "").match(/^([^\s]*(\s*([^"';\s]*|"[^"]*?"|'[^']*?'))*)\s*(;(.*))?$/)[1]);
	}

	dictionary.keywords["else"] = {
		type: "1",
		name: "else",
		non_contextual_errors: dictionary.keywords["end"].non_contextual_errors
	}

	dictionary.keywords["else"].contextual_validate = function(script)
	{
		if (script.conditionalLevel)
			script.indentIncrement = -1;
		else {
			script.conditionalLevel = 1;
			script.pushError("else statement invalid without preceeding if statement");
		}

		if (script.elseDone[script.conditionalLevel])
			script.pushError("else statement invalid after else statement on line " + script.elseDone[script.conditionalLevel]);
		else
			script.elseDone[script.conditionalLevel] = script.lineNumber;
	}

	dictionary.keywords["endif"] = {
		type: "1",
		name: "endif",
		non_contextual_errors: dictionary.keywords["else"].non_contextual_errors
	}

	dictionary.keywords["endif"].contextual_validate = function(script)
	{
		if (script.conditionalLevel)
			script.conditionalLevel--;
		else
			script.pushError("endif statement invalid without preceeding if statement");
	}

	dictionary.keywords["set"] = {
		type: "2",
		name: "set",
		non_contextual_errors: []
	}

	dictionary.keywords["set"].non_contextual_errors[""] = /^([^\d\W]\w*\.)?\w+\s+to\s+[^;]+(;(.*))?$/i;
	dictionary.keywords["set"].non_contextual_errors["EditorID starts with a number"] = /^\d[^\s;]*\.\w+\s+to\s+[^;]+\s*(;(.*))?$/i;
	dictionary.keywords["set"].non_contextual_errors["EditorID contains invalid character"] = /^[^\s;]+\.\w+\s+to\s+[^;]+\s*(;(.*))?$/i;
	dictionary.keywords["set"].non_contextual_errors["Invalid variable name"] = /^[^\s;]+\s+to\s+[^;]+\s*(;(.*))?$/i;
	dictionary.keywords["set"].non_contextual_errors["Variable name missing"] = /^(to\s+[^;]*)?\s*(;(.*))?$/i;
	dictionary.keywords["set"].non_contextual_errors["Expression missing"] = /^[^\s;]+(\.\w+)?\s+to\s*(;(.*))?$/i;
	dictionary.keywords["set"].non_contextual_errors["\"to\" missing"] = /^[^\s;]+(\.\w+)?(\s+[^\s;]+)*\s*(;(.*))?$/i;

	dictionary.keywords["set"].contextual_validate = function(script)
	{
		var incrSets;

		if (script.isValid == true) {
			var ID = script.input[script.lineNumber].match(/^\s*set\s+((\w+)\.)?(\w+)\s+to\s+([^;])+(;(.*))?$/i)[2];
			var varName = script.input[script.lineNumber].match(/^\s*set\s+((\w+)\.)?(\w+)\s+to\s+([^;])+(;(.*))?$/i)[3];

			if (ID != undefined && ID != "") {
				if (!(ID.toLowerCase() in script.editorIDs)) {
					if (ID.toLowerCase() in script.variables["#local"] || ID.toLowerCase() in script.variables["#global"])
						script.pushError("\"" + ID + "\" is a variable name, so cannot be used as an editorID");
					else if (ID.toLowerCase() in dictionary.keywords)
						script.pushError("\"" + ID + "\" is a keyword");
					else
						script.editorIDs[ID.toLowerCase()] = new editorID();
				}
			}

			if (varName.toLowerCase() in script.variables["#local"] == false || (ID != undefined && ID != "")) {
				if (varName.toLowerCase() in script.editorIDs)
					script.pushError("\"" + varName + "\" is an editorID for a non-global form");
				else if (varName.toLowerCase() in dictionary.keywords)
					script.pushError("\"" + varName + "\" is a keyword");
				else if (varName.toLowerCase() in dictionary.functions)
					script.pushError("\"" + varName + "\" is a function");
				else if (ID == undefined && !(varName in script.variables["#global"])) {
					script.variables["#global"][varName.toLowerCase()] = new variable(varName);
					script.pushWarning("\"" + varName + "\" is not declared in this script.  Make sure it is a global variable")
				} else {
					if (ID == "constructor")
						ID = "#constructor";
					if (!(ID in script.variables))
						script.variables[ID] = {};
					script.variables[ID][varName.toLowerCase()] = new variable(varName);
				}
			} else if (varName.toLowerCase() in script.variables["#local"])
				incrSets = 1;

			if (script.isValid == true)
				validateExpression(script.input[script.lineNumber].replace(/^\s*set\s+([^\W\d]\w+\.)?\w+\s+to\s*/i, "").match(/^([^\s]*(\s*([^"';\s]*|"[^"]*?"|'[^']*?'))*)\s*(;(.*))?$/)[1]);

			if (incrSets == 1)
				script.variables["#local"][varName.toLowerCase()].sets++;
		}
	}

	dictionary.keywords["int"] = {
		type: "2",
		name: "int",
		non_contextual_errors: []
	}

	dictionary.keywords["int"].contextual_validate = function(script)
	{
		if (script.inBlock != "") {
			script.pushError("Variable declaration illegal within Begin/End block");
		}

		var varName = trim(script.input[script.lineNumber]).replace(/^\w+\s+/, "").replace(/\s*(;(.*))?$/, "");

		if (script.isValid == true) {
			if (varName.toLowerCase() in script.variables["#local"])
				script.pushError("Variable \"" + varName + "\" has already been declared");
			else if (varName.toLowerCase() in script.variables["#global"])
				script.pushError("\"" + varName + "\" is the name of a global variable");
			else if (varName.toLowerCase() in dictionary.keywords)
				script.pushError("\"" + varName + "\" is a keyword");
			else if (varName.toLowerCase() in script.editorIDs)
				script.pushError("\"" + varName + "\" is an editorID for a non-global form");
			else
				script.variables["#local"][varName.toLowerCase()] = new variable(varName, "int");
		}
	}

	dictionary.keywords["int"].non_contextual_errors[""] = /^\w*[^\W\d]+\w*\s*(;(.*))?$/;
	dictionary.keywords["int"].non_contextual_errors["Variable name missing"] = /^(;(.*))?$/;
	dictionary.keywords["int"].non_contextual_errors["Variable name cannot be a number"] = /^\d+\s*(;(.*))?$/;
	dictionary.keywords["int"].non_contextual_errors["Multiple variable names"] = /^[^\s;]+(\s+[^\s;]+)+\s*(;(.*))?$/;
	dictionary.keywords["int"].non_contextual_errors["Variable name contains invalid character"] = /^(\w*[^\s\w;])+\w*\s*(;(.*))?$/;

	dictionary.keywords["short"] = {
		type: "2",
		name: "short",
		shortName: "int",
		non_contextual_errors: dictionary.keywords["int"].non_contextual_errors,
		contextual_validate: dictionary.keywords["int"].contextual_validate
	}

	dictionary.keywords["long"] = {
		type: "2",
		name: "int",
		shortName: "int",
		non_contextual_errors: dictionary.keywords["int"].non_contextual_errors,
		contextual_validate: dictionary.keywords["int"].contextual_validate
	}

	dictionary.keywords["float"] = {
		type: "2",
		name: "float",
		non_contextual_errors: dictionary.keywords["int"].non_contextual_errors
	}

	dictionary.keywords["float"].contextual_validate = function(script)
	{
		if (script.inBlock != "") {
			script.pushError("Variable declaration illegal within Begin/End block");
		}

		var varName = trim(script.input[script.lineNumber]).replace(/^\w+\s+/, "").replace(/\s*(;(.*))?$/, "");

		if (script.isValid == true) {
			if (varName.toLowerCase() in script.variables["#local"])
				script.pushError("Variable \"" + varName + "\" has already been declared");
			else if (varName.toLowerCase() in script.variables["#global"])
				script.pushError("\"" + varName + "\" is the name of a global variable");
			else if (varName.toLowerCase() in dictionary.keywords)
				script.pushError("\"" + varName + "\" is a keyword");
			else if (varName.toLowerCase() in script.editorIDs)
				script.pushError("\"" + varName + "\" is an editorID for a non-global form");
			else
				script.variables["#local"][varName.toLowerCase()] = new variable(varName, "float");
		}
	}

	dictionary.keywords["ref"] = {
		type: "2",
		name: "ref",
		non_contextual_errors: dictionary.keywords["int"].non_contextual_errors
	}

	dictionary.keywords["ref"].contextual_validate = function(script)
	{
		if (script.inBlock != "") {
			script.pushError("Variable declaration illegal within Begin/End block");
		}

		var varName = trim(script.input[script.lineNumber]).replace(/^\w+\s+/, "").replace(/\s*(;(.*))?$/, "");

		if (script.isValid == true) {
			if (varName.toLowerCase() in script.variables["#local"])
				script.pushError("Variable \"" + varName + "\" has already been declared");
			else if (varName.toLowerCase() in script.variables["#global"])
				script.pushError("\"" + varName + "\" is the name of a global variable");
			else if (varName.toLowerCase() in dictionary.keywords)
				script.pushError("\"" + varName + "\" is a keyword");
			else if (varName.toLowerCase() in script.editorIDs)
				script.pushError("\"" + varName + "\" is an editorID for a non-global form");
			else
				script.variables["#local"][varName.toLowerCase()] = new variable(varName, "ref");
		}
	}
	dictionary.keywords["reference"] = {
		type: "2",
		name: "reference",
		shortName: "ref",
		non_contextual_errors: dictionary.keywords["ref"].non_contextual_errors,
		contextual_validate: dictionary.keywords["ref"].contextual_validate
	}
}

//Blocktypes
{
	dictionary.blocktypes["gamemode"] = new blocktype(7, {docLink: "http://geck.bethsoft.com/index.php/GameMode", name: "GameMode"});
	dictionary.blocktypes["menumode"] = new blocktype(7, {docLink: "http://geck.bethsoft.com/index.php/MenuMode", name: "MenuMode"});
	dictionary.blocktypes["onactivate"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnActivate", name: "OnActivate"});
	dictionary.blocktypes["onactorequip"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnActorEquip", name: "OnActorEquip"});
	dictionary.blocktypes["onactorunequip"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnActorUnequip", name: "OnActorUnequip"});
	dictionary.blocktypes["onadd"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnAdd", name: "OnAdd"});
	dictionary.blocktypes["onclose"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnClose", name: "OnClose"});
	dictionary.blocktypes["oncombatend"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnCombatEnd", name: "OnCombatEnd"});
	dictionary.blocktypes["ondeath"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnDeath", name: "OnDeath"});
	dictionary.blocktypes["ondestructionstagechange"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnDestructionStageChange", name: "OnDestructionStageChange"});
	dictionary.blocktypes["ondrop"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnDrop", name: "OnDrop"});
	dictionary.blocktypes["onequip"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnEquip", name: "OnEquip"});
	dictionary.blocktypes["ongrab"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnGrab", name: "OnGrab"});
	dictionary.blocktypes["onhit"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnHit", name: "OnHit"});
	dictionary.blocktypes["onhitwith"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnHitWith", name: "OnHitWith"});
	dictionary.blocktypes["onload"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnLoad", name: "OnLoad"});
	dictionary.blocktypes["onmagiceffecthit"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnMagicEffectHit", name: "OnMagicEffectHit"});
	dictionary.blocktypes["onmurder"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnMurder", name: "OnMurder"});
	dictionary.blocktypes["onopen"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnOpen", name: "OnOpen"});
	dictionary.blocktypes["onpackagechange"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnPackageChange", name: "OnPackageChange"});
	dictionary.blocktypes["onpackagedone"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnPackageDone", name: "OnPackageDone"});
	dictionary.blocktypes["onpackagestart"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnPackageStart", name: "OnPackageStart"});
	dictionary.blocktypes["onrelease"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnRelease", name: "OnRelease"});
	dictionary.blocktypes["onreset"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnReset", name: "OnReset"});
	dictionary.blocktypes["onsell"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnSell", name: "OnSell"});
	dictionary.blocktypes["onstartcombat"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnStartCombat", name: "OnStartCombat"});
	dictionary.blocktypes["ontrigger"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnTrigger", name: "OnTrigger"});
	dictionary.blocktypes["ontriggerenter"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnTriggerEnter", name: "OnTriggerEnter"});
	dictionary.blocktypes["ontriggerleave"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnTriggerLeave", name: "OnTriggerLeave"});
	dictionary.blocktypes["onunequip"] = new blocktype(4, {docLink: "http://geck.bethsoft.com/index.php/OnUnequip", name: "OnUnequip"});
	dictionary.blocktypes["saytodone"] = new blocktype(6, {docLink: "http://geck.bethsoft.com/index.php/SayToDone", name: "SayToDone"});
	dictionary.blocktypes["scripteffectfinish"] = new blocktype(8, {docLink: "http://geck.bethsoft.com/index.php/ScriptEffectFinish", name: "ScriptEffectFinish"});
	dictionary.blocktypes["scripteffectstart"] = new blocktype(8, {docLink: "http://geck.bethsoft.com/index.php/ScriptEffectStart", name: "ScriptEffectStart"});
	dictionary.blocktypes["scripteffectupdate"] = new blocktype(8, {docLink: "http://geck.bethsoft.com/index.php/ScriptEffectUpdate", name: "ScriptEffectUpdate"});
}

//Values
{
	dictionary.values.attributes = {
		strength: "Strength",
		perception: "Perception",
		endurance: "Endurance",
		charisma: "Charisma",
		intelligence: "Intelligence",
		agility: "Agility",
		luck: "Luck"
	}

	dictionary.values.skills = {
		barter: "Barter",
		bigguns: "BigGuns",
		energyweapons: "EnergyWeapons",
		explosives: "Explosives",
		lockpick: "Lockpick",
		medicine: "Medicine",
		meleeweapons: "MeleeWeapons",
		repair: "Repair",
		science: "Science",
		smallguns: "SmallGuns",
		sneak: "Sneak",
		speech: "Speech",
		throwing: "Throwing",
		unarmed: "Unarmed"
	}

	dictionary.values.actorValues = {
		actionpoints: "ActionPoints",
		carryweight: "CarryWeight",
		critchance: "CritChance",
		healrate: "HealRate",
		health: "Health",
		meleedamage: "MeleeDamage",
		unarmeddamage: "UnarmedDamage",
		damageresist: "DamageResist",
		poisonresist: "PoisonResist",
		radresist: "RadResist",
		speedmult: "SpeedMult",
		fatigue: "Fatigue",
		karma: "Karma",
		xp: "XP",
		perceptioncondition: "PerceptionCondition",
		endurancecondition: "EnduranceCondition",
		leftattackcondition: "LeftAttackCondition",
		rightattackcondition: "RightAttackCondition",
		leftmobilitycondition: "LeftMobilityCondition",
		rightmobilitycondition: "RightMobilityCondition",
		braincondition: "BrainCondition",
		aggression: "Aggression",
		assistance: "Assistance",
		confidence: "Confidence",
		energy: "Energy",
		responsibility: "Responsibility",
		mood: "Mood",
		inventoryweight: "InventoryWeight",
		paralysis: "Paralysis",
		invisibility: "Invisibility",
		chameleon: "Chameleon",
		nighteye: "NightEye",
		detectliferange: "DetectLifeRange",
		fireresist: "FireResist",
		waterbreathing: "WaterBreathing",
		radiationrads: "RadiationRads",
		bloodymess: "BloodyMess",
		ignorecrippledlimbs: "IgnoreCrippledLimbs",
		variable01: "Variable01",
		variable02: "Variable02",
		variable03: "Variable03",
		variable04: "Variable04",
		variable05: "Variable05",
		variable06: "Variable06",
		variable07: "Variable07",
		variable08: "Variable08",
		variable09: "Variable09",
		variable10: "Variable10"
	};
	dictionary.values.actorValues = combineObjects([dictionary.values.attributes, dictionary.values.skills, dictionary.values.actorValues])

	dictionary.values.axes = {
		x: "X",
		y: "Y",
		z: "Z"
	};

	dictionary.values.menuModes = {
		0: "0",
		1: "1",
		2: "2",
		3: "3",
		1001: "1001",
		1002: "1002",
		1003: "1003",
		1004: "1004",
		1007: "1007",
		1008: "1008",
		1009: "1009",
		1012: "1012",
		1013: "1013",
		1014: "1014",
		1016: "1016",
		1023: "1023",
		1027: "1027",
		1035: "1035",
		1036: "1036",
		1047: "1047",
		1048: "1048",
		1051: "1051",
		1053: "1053",
		1054: "1054",
		1055: "1055",
		1056: "1056",
		1057: "1057",
		1058: "1058",
		1059: "1059",
		1060: "1060"
	};
}

//Non-FOSE Functions
{
	dictionary.functions["unusedfunction0"] = new scriptFunction("void", "D", 0, [], {name: "UnusedFunction0"});
	dictionary.functions["getdistance"] = new scriptFunction("float", "R", 0, [new scriptFunctionParam("ref", "Target")], {docLink: "http://geck.bethsoft.com/index.php/GetDistance", name: "GetDistance"}, [new scriptFunctionNote(
		function(functionCall) {
			if (functionCall[0] != null)
				return functionCall[0].toLowerCase() in {player: 1, playerref: 1};
			else 
				return false;
		},
		"GetDistance shouldn't be called on the player.  Pass \"player\" as a parameter of GetDistance instead",
		1), new scriptFunctionNote(
		function(functionCall) {
			if (functionCall[0] != null && functionCall[1] != null)
				return functionCall[0].toLowerCase() == functionCall[1].toLowerCase();
			else 
				return false;
		},
		"You are calling GetDistance on the same reference as you are passing as its parameter",
		1)]);
	dictionary.functions["additem"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "ObjectID"), new scriptFunctionParam("int", "Count"), new scriptFunctionParam("int", "HideMessageFlag", true)], {docLink: "http://geck.bethsoft.com/index.php/AddItem", name: "AddItem"});
	dictionary.functions["setessential"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("ref", "BaseID"), new scriptFunctionParam("boolean", "Flag")], {docLink: "http://geck.bethsoft.com/index.php/SetEssential", name: "SetEssential"});
	dictionary.functions["rotate"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("string", "Axis"), new scriptFunctionParam("float", "DegreesPerSec")], {docLink: "http://geck.bethsoft.com/index.php/Rotate", name: "Rotate"});
	dictionary.functions["getlocked"] = new scriptFunction("bool", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetLocked", name: "GetLocked"}); //0, 1
	dictionary.functions["getpos"] = new scriptFunction("float", "R", 0, [new scriptFunctionParam("string", "Axis", false, dictionary.values.axes)], {docLink: "http://geck.bethsoft.com/index.php/GetPos", name: "GetPos"});
	dictionary.functions["setpos"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("string", "Axis", false, dictionary.values.axes), new scriptFunctionParam("float", "Pos")], {docLink: "http://geck.bethsoft.com/index.php/SetPos", name: "SetPos"});
	dictionary.functions["getangle"] = new scriptFunction("float", "R", 0, [new scriptFunctionParam("string", "Axis", false, dictionary.values.axes)], {docLink: "http://geck.bethsoft.com/index.php/GetAngle", name: "GetAngle"});
	dictionary.functions["setangle"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("string", "Axis", false, dictionary.values.axes), new scriptFunctionParam("float", "Angle")], {docLink: "http://geck.bethsoft.com/index.php/SetAngle", name: "SetAngle"});
	dictionary.functions["getstartingpos"] = new scriptFunction("float", "R", 0, [new scriptFunctionParam("string", "Axis", false, dictionary.values.axes)], {docLink: "http://geck.bethsoft.com/index.php/GetStartingPos", name: "GetStartingPos"});
	dictionary.functions["getstartingangle"] = new scriptFunction("float", "R", 0, [new scriptFunctionParam("string", "Axis", false, dictionary.values.axes)], {docLink: "http://geck.bethsoft.com/index.php/GetStartingAngle", name: "GetStartingAngle"});
	dictionary.functions["getsecondspassed"] = new scriptFunction("float", "B", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetSecondsPassed", name: "GetSecondsPassed"}, [new scriptFunctionNote(
		function(functionCall) {return script.inBlock.toLowerCase() == "scripteffectupdate";}, "Use \"ScriptEffectElapsedSeconds\" instead of \"GetSecondsPassed\" in a \"ScriptEffectUpdate\" block", 0), new scriptFunctionNote(
		function(functionCall) {return !(script.inBlock.toLowerCase() in {"scripteffectupdate": 1, "ontrigger": 1, "gamemode": 1, "menumode": 1});}, "\"GetSecondsPassed\" should not be used in this type of Begin/End block, as it does not run continuously", 1)]);
	dictionary.functions["activate"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "ActionRef", true), new scriptFunctionParam("int", "RunOnActivateBlockFlag", true)], {docLink: "http://geck.bethsoft.com/index.php/Activate", name: "Activate"}); //ActionRef param can be omitted if called in OnActivate block
	dictionary.functions["getactorvalue"] = new scriptFunction("float", "R", 0, [new scriptFunctionParam("string", "StatName", false, dictionary.values.actorValues)], {docLink: "http://geck.bethsoft.com/index.php/GetActorValue", name: "GetActorValue", shortName: "GetAV", longName: "GetActorValue"});
	dictionary.functions["getav"] = alias(dictionary.functions["getactorvalue"]);
	dictionary.functions["setactorvalue"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("string", "StatName", false, dictionary.values.actorValues), new scriptFunctionParam("float", "Value")], {docLink: "http://geck.bethsoft.com/index.php/SetActorValue", name: "SetActorValue", shortName: "SetAV", longName: "SetActorValue"});
	dictionary.functions["setav"] = alias(dictionary.functions["setactorvalue"]);
	dictionary.functions["modactorvalue"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("string", "StatName", false, dictionary.values.actorValues), new scriptFunctionParam("float", "Value")], {docLink: "http://geck.bethsoft.com/index.php/ModActorValue", name: "ModActorValue", shortName: "ModAV", longName: "ModActorValue"});
	dictionary.functions["modav"] = alias(dictionary.functions["modactorvalue"]);
	dictionary.functions["setatstart"] = new scriptFunction("void", "D", 0, [], {docLink: "http://geck.bethsoft.com/index.php/SetAtStart", name: "SetAtStart"});
	dictionary.functions["getcurrenttime"] = new scriptFunction("float", "B", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetCurrentTime", name: "GetCurrentTime"});
	dictionary.functions["playgroup"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("string", "AnimGroup"), new scriptFunctionParam("int", "InitFlag")], {docLink: "http://geck.bethsoft.com/index.php/PlayGroup", name: "PlayGroup"});
	dictionary.functions["loopgroup"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("string", "AnimGroup"), new scriptFunctionParam("int", "InitFlag")], {docLink: "http://geck.bethsoft.com/index.php/LoopGroup", name: "LoopGroup"});
	dictionary.functions["skipanim"] = new scriptFunction("void", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/SkipAnim", name: "SkipAnim"});
	dictionary.functions["startcombat"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "ActorID", true)], {docLink: "http://geck.bethsoft.com/index.php/StartCombat", name: "StartCombat"});
	dictionary.functions["stopcombat"] = new scriptFunction("void", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/StopCombat", name: "StopCombat"});
	dictionary.functions["getscale"] = new scriptFunction("float", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetScale", name: "GetScale"});
	dictionary.functions["ismoving"] = new scriptFunction("bool", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsMoving", name: "IsMoving"}); //0, 1, 2, 3, 4
	dictionary.functions["isturning"] = new scriptFunction("bool", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsTurning", name: "IsTurning"}); //0, 1, 2
	dictionary.functions["getlineofsight"] = new scriptFunction("bool", "R", 0, [new scriptFunctionParam("ref", "ObjectID")], {docLink: "http://geck.bethsoft.com/index.php/GetLineOfSight", name: "GetLineOfSight", shortName: "GetLOS", longName: "GetLineOfSight"}); //0, 1
	dictionary.functions["getlos"] = alias(dictionary.functions["getlineofsight"]); //0, 1
	dictionary.functions["addspell"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "EffectID")], {docLink: "http://geck.bethsoft.com/index.php/AddSpell", name: "AddSpell"});
	dictionary.functions["removespell"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "EffectID")], {docLink: "http://geck.bethsoft.com/index.php/RemoveSpell", name: "RemoveSpell"});
	dictionary.functions["cast"] = new scriptFunction("void", "D", 0, [], {docLink: "http://geck.bethsoft.com/index.php/Cast", name: "Cast"}, [new scriptFunctionNote(
		function(functionCall) {return true;},
		"Use CastImmediateOnSelf instead",
		1)]);
	dictionary.functions["getbuttonpressed"] = new scriptFunction("int", "B", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetButtonPressed", name: "GetButtonPressed"}, [new scriptFunctionNote(
		function(functionCall) {return !(script.inBlock.toLowerCase() in {"scripteffectupdate": 1, "ontrigger": 1, "gamemode": 1, "menumode": 1});}, "\"GetButtonPressed\" should not be used in this type of Begin/End block, as it does not run continuously", 1)]);
	dictionary.functions["getinsamecell"] = new scriptFunction("bool", "R", 0, [new scriptFunctionParam("ref", "Target")], {docLink: "http://geck.bethsoft.com/index.php/GetInSameCell", name: "GetInSameCell"});
	dictionary.functions["enable"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("int", "FadeIn", true)], {docLink: "http://geck.bethsoft.com/index.php/Enable", name: "Enable"});
	dictionary.functions["disable"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("int", "FadeIn", true)], {docLink: "http://geck.bethsoft.com/index.php/Disable", name: "Disable"});
	dictionary.functions["getdisabled"] = new scriptFunction("bool", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetDisabled", name: "GetDisabled"}); //0, 1
	dictionary.functions["menumode"] = new scriptFunction("bool", "B", 0, [new scriptFunctionParam("int", "Menu Number", true, dictionary.values.menuModes)], {docLink: "http://geck.bethsoft.com/index.php/MenuMode_(Function)", name: "MenuMode"});
	dictionary.functions["placeatme"] = new scriptFunction("ref", "R", 0, [new scriptFunctionParam("ref", "ObjectID"), new scriptFunctionParam("int", "Count", true), new scriptFunctionParam("float", "Distance", true, false, true), new scriptFunctionParam("int", "Direction", true, {0: "0", 1: "1", 2: "2", 3: "3"}, true)], {docLink: "http://geck.bethsoft.com/index.php/PlaceAtMe", name: "PlaceAtMe"});
	dictionary.functions["playsound"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("ref", "SoundID")], {docLink: "http://geck.bethsoft.com/index.php/PlaySound", name: "PlaySound"});
	dictionary.functions["getdisease"] = new scriptFunction("void", "D", 0, [], {name: "GetDisease"});
	dictionary.functions["getvampire"] = new scriptFunction("void", "D", 0, [], {name: "GetVampire"});
	dictionary.functions["getclothingvalue"] = new scriptFunction("float", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetClothingValue", name: "GetClothingValue"});
	dictionary.functions["samefaction"] = new scriptFunction("bool", "R", 0, [new scriptFunctionParam("ref", "ActorID")], {docLink: "http://geck.bethsoft.com/index.php/SameFaction", name: "SameFaction"});
	dictionary.functions["samerace"] = new scriptFunction("bool", "R", 0, [new scriptFunctionParam("ref", "ActorID")], {docLink: "http://geck.bethsoft.com/index.php/SameRace", name: "SameRace"});
	dictionary.functions["samesex"] = new scriptFunction("bool", "R", 0, [new scriptFunctionParam("ref", "ActorID")], {docLink: "http://geck.bethsoft.com/index.php/SameSex", name: "SameSex"});
	dictionary.functions["getdetected"] = new scriptFunction("bool", "R", 0, [new scriptFunctionParam("ref", "ActorID")], {docLink: "http://geck.bethsoft.com/index.php/GetDetected", name: "GetDetected"});
	dictionary.functions["getdead"] = new scriptFunction("bool", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetDead", name: "GetDead"});
	dictionary.functions["getitemcount"] = new scriptFunction("int", "R", 0, [new scriptFunctionParam("ref", "ObjectID")], {docLink: "http://geck.bethsoft.com/index.php/GetItemCount", name: "GetItemCount"}, [new scriptFunctionNote(
		function(functionCall) {return (/caps001/i.test(functionCall[1]));},
		"GetGold is more reliable than \"GetItemCount\" when checking how many caps an actor has in their inventory",
		0)]); //GetGold better for Caps001?
	dictionary.functions["getgold"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetGold", name: "GetGold"}); //0+
	dictionary.functions["getsleeping"] = new scriptFunction("bool", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetSleeping", name: "GetSleeping"}); //0, 1, 2, 3, 4
	dictionary.functions["gettalkedtopc"] = new scriptFunction("bool", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetTalkedToPC", name: "GetTalkedToPC"}); //0, 1
	dictionary.functions["say"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("int", "ForceSubtitleFlag", true), new scriptFunctionParam("ref", "Actor", true), new scriptFunctionParam("int", "Undocumented int", true)], {docLink: "http://geck.bethsoft.com/index.php/Say", name: "Say"})
	dictionary.functions["sayto"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "TargetActor"), new scriptFunctionParam("ref", "TopicID"), new scriptFunctionParam("int", "ForceSubtitleFlag", true), new scriptFunctionParam("int", "NoTargetLook", true)], {docLink: "http://geck.bethsoft.com/index.php/SayTo", name: "SayTo"});
	dictionary.functions["getscriptvariable"] = new scriptFunction("int", "B", 0, [new scriptFunctionParam("ref", "ObjectID"), new scriptFunctionParam("string", "VarName")], {docLink: "http://geck.bethsoft.com/index.php/GetScriptVariable", name: "GetScriptVariable"}, [new scriptFunctionNote(
		function(functionCall) {return true;}, "\"GetScriptVariable\" is only available in conditions.  Use \"ObjectID.VarName\" for remote variable access in scripts", 1)]); //Depends on target
	dictionary.functions["startquest"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("ref", "QuestName")], {docLink: "http://geck.bethsoft.com/index.php/StartQuest", name: "StartQuest"});
	dictionary.functions["stopquest"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("ref", "QuestName")], {docLink: "http://geck.bethsoft.com/index.php/StopQuest", name: "StopQuest"});
	dictionary.functions["getquestrunning"] = new scriptFunction("bool", "B", 0, [new scriptFunctionParam("ref", "QuestName")], {docLink: "http://geck.bethsoft.com/index.php/GetQuestRunning", name: "GetQuestRunning", shortName: "GetQR", longName: "GetQuestRunning"}); //0, 1
	dictionary.functions["getqr"] = alias(dictionary.functions["getquestrunning"]); //0, 1
	dictionary.functions["setstage"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("ref", "QuestName"), new scriptFunctionParam("int", "StageIndex")], {docLink: "http://geck.bethsoft.com/index.php/SetStage", name: "SetStage"});
	dictionary.functions["getstage"] = new scriptFunction("int", "B", 0, [new scriptFunctionParam("ref", "QuestName")], {docLink: "http://geck.bethsoft.com/index.php/GetStage", name: "GetStage"}); //0+
	dictionary.functions["getstagedone"] = new scriptFunction("bool", "B", 0, [new scriptFunctionParam("ref", "QuestName"), new scriptFunctionParam("int", "StageIndex")], {docLink: "http://geck.bethsoft.com/index.php/GetStageDone", name: "GetStageDone"}); //0, 1
	dictionary.functions["getfactionrankdifference"] = new scriptFunction("int", "R", 0, [new scriptFunctionParam("ref", "FactionID"), new scriptFunctionParam("ref", "ActorID")], {docLink: "http://geck.bethsoft.com/index.php/GetFactionRankDifference", name: "GetFactionRankDifference"});
	dictionary.functions["getalarmed"] = new scriptFunction("bool", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetAlarmed", name: "GetAlarmed"});
	dictionary.functions["israining"] = new scriptFunction("bool", "B", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsRaining", name: "IsRaining"});
	dictionary.functions["getattacked"] = new scriptFunction("bool", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetAttacked", name: "GetAttacked"});
	dictionary.functions["getiscreature"] = new scriptFunction("bool", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetIsCreature", name: "GetIsCreature"});
	dictionary.functions["getlocklevel"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetLockLevel", name: "GetLockLevel"});
	dictionary.functions["getshouldattack"] = new scriptFunction("bool", "R", 0, [new scriptFunctionParam("ref", "TargetActor")], {docLink: "http://geck.bethsoft.com/index.php/GetShouldAttack", name: "GetShouldAttack"});
	dictionary.functions["getincell"] = new scriptFunction("bool", "R", 0, [new scriptFunctionParam("ref", "CellID")], {docLink: "http://geck.bethsoft.com/index.php/GetInCell", name: "GetInCell"});
	dictionary.functions["getisclass"] = new scriptFunction("bool", "R", 0, [new scriptFunctionParam("string", "ClassID")], {docLink: "http://geck.bethsoft.com/index.php/GetIsClass", name: "GetIsClass"});
	dictionary.functions["getisrace"] = new scriptFunction("bool", "R", 0, [new scriptFunctionParam("ref", "RaceID")], {docLink: "http://geck.bethsoft.com/index.php/GetIsRace", name: "GetIsRace"});
	dictionary.functions["getissex"] = new scriptFunction("bool", "R", 0, [new scriptFunctionParam("string", "Sex", false, {male: "Male", female: "Female"})], {docLink: "http://geck.bethsoft.com/index.php/GetIsSex", name: "GetIsSex"});
	dictionary.functions["getinfaction"] = new scriptFunction("bool", "R", 0, [new scriptFunctionParam("ref", "FactionID")], {docLink: "http://geck.bethsoft.com/index.php/GetInFaction", name: "GetInFaction"});
	dictionary.functions["getisid"] = new scriptFunction("bool", "R", 0, [new scriptFunctionParam("ref", "ObjectID")], {docLink: "http://geck.bethsoft.com/index.php/GetIsID", name: "GetIsID"});
	dictionary.functions["getfactionrank"] = new scriptFunction("int", "R", 0, [new scriptFunctionParam("ref", "FactionID")], {docLink: "http://geck.bethsoft.com/index.php/GetFactionRank", name: "GetFactionRank"});
	dictionary.functions["getglobalvalue"] = new scriptFunction("int", "B", 0, [new scriptFunctionParam("string", "VarName")], {docLink: "http://geck.bethsoft.com/index.php/GetGlobalValue", name: "GetGlobalValue"}, [new scriptFunctionNote(
		function(functionCall) {return true;}, "\"GetGlobalValue\" is only available in conditions.  Use \"VarName\" for global variable access in scripts", 1)]); //Depends on target
	dictionary.functions["issnowing"] = new scriptFunction("bool", "B", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsSnowing", name: "IsSnowing"});
	dictionary.functions["getdisposition"] = new scriptFunction("int", "R", 0, [new scriptFunctionParam("ref", "ActorID")], {docLink: "http://geck.bethsoft.com/index.php/GetDisposition", name: "GetDisposition"});
	dictionary.functions["getrandompercent"] = new scriptFunction("int", "B", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetRandomPercent", name: "GetRandomPercent"}); //0-99
	dictionary.functions["streammusic"] = new scriptFunction("void", "D", 0, [], {name: "StreamMusic"});
	dictionary.functions["getquestvariable"] = new scriptFunction("int", "B", 0, [new scriptFunctionParam("ref", "ObjectID"), new scriptFunctionParam("string", "VarName")], {docLink: "http://geck.bethsoft.com/index.php/GetQuestVariable", name: "GetQuestVariable"}, [new scriptFunctionNote(
		function(functionCall) {return true;}, "\"GetQuestVariable\" is only available in conditions.  Use \"ObjectID.VarName\" for remote variable access in scripts", 1)]); //Depends on target
	dictionary.functions["getlevel"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetLevel", name: "GetLevel"}); //1+
	dictionary.functions["getarmorrating"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetArmorRating", name: "GetArmorRating"}); //0-100
	dictionary.functions["removeitem"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "ObjectID"), new scriptFunctionParam("int", "Count"), new scriptFunctionParam("int", "HideMessageFlag", true)], {docLink: "http://geck.bethsoft.com/index.php/RemoveItem", name: "RemoveItem"});
	dictionary.functions["moddisposition"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "ActorID"), new scriptFunctionParam("int", "Value")], {docLink: "http://geck.bethsoft.com/index.php/ModDisposition", name: "ModDisposition"});
	dictionary.functions["getdeadcount"] = new scriptFunction("int", "B", 0, [new scriptFunctionParam("ref", "ActorID")], {docLink: "http://geck.bethsoft.com/index.php/GetDeadCount", name: "GetDeadCount"}); //0+
	dictionary.functions["showmap"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("ref", "MapMarkerID"), new scriptFunctionParam("int", "EnableFastTravel", true)], {docLink: "http://geck.bethsoft.com/index.php/ShowMap", name: "ShowMap"});
	dictionary.functions["startconversation"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "ActorID"), new scriptFunctionParam("ref", "TopicID", true), new scriptFunctionParam("ref", "SpeakerLocation", true), new scriptFunctionParam("ref", "TargetLocation"), new scriptFunctionParam("int", "HeadTrackFlag", true), new scriptFunctionParam("int", "AllowMovementFlag", true)], {docLink: "http://geck.bethsoft.com/index.php/StartConversation", name: "StartConversation"}); //Documentation unclear
	dictionary.functions["drop"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "ObjectID"), new scriptFunctionParam("int", "Count")], {docLink: "http://geck.bethsoft.com/index.php/Drop", name: "Drop"});
	dictionary.functions["addtopic"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("ref", "TopicID")], {docLink: "http://geck.bethsoft.com/index.php/AddTopic", name: "AddTopic"});
	dictionary.functions["showmessage"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("ref", "MessageID"), new scriptFunctionParam("void", "Var1", true), new scriptFunctionParam("void", "Var2", true), new scriptFunctionParam("void", "Var3", true), new scriptFunctionParam("void", "Var4", true), new scriptFunctionParam("void", "Var5", true), new scriptFunctionParam("void", "Var6", true), new scriptFunctionParam("void", "Var7", true), new scriptFunctionParam("void", "Var8", true), new scriptFunctionParam("void", "Var9", true), new scriptFunctionParam("int", "Duration", true, false, true)], {docLink: "http://geck.bethsoft.com/index.php/ShowMessage", name: "ShowMessage"}, [new scriptFunctionNote(
		function(functionCall) {
			for (var i = 2; i in functionCall; i++) {
				if (/^(".*?"|'.*?'|(\d*\.)?\d+)$/.test(functionCall[i]) == true)
					return true;
			}
			return false;
		},
		"\"ShowMessage\" only accepts variables for parameters \"Var1\" through \"Var9\"",
		1)]);
	dictionary.functions["setalert"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("int", "Flag")], {docLink: "http://geck.bethsoft.com/index.php/SetAlert", name: "SetAlert"});
	dictionary.functions["getisalerted"] = new scriptFunction("bool", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetIsAlerted", name: "GetIsAlerted"});
	dictionary.functions["look"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "TargetID")], {docLink: "http://geck.bethsoft.com/index.php/Look", name: "Look"});
	dictionary.functions["stoplook"] = new scriptFunction("void", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/StopLook", name: "StopLook"});
	dictionary.functions["evaluatepackage"] = new scriptFunction("void", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/EvaluatePackage", name: "EvaluatePackage", shortName: "EVP", longName: "EvaluatePackage"});
	dictionary.functions["evp"] = alias(dictionary.functions["evaluatepackage"]);
	dictionary.functions["sendassaultalarm"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "VictimID"), new scriptFunctionParam("ref", "VictimFactionID", true)], {docLink: "http://geck.bethsoft.com/index.php/SendAssaultAlarm", name: "SendAssaultAlarm"});
	dictionary.functions["enableplayercontrols"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("int", "MovementFlag", true), new scriptFunctionParam("int", "PipboyFlag", true), new scriptFunctionParam("int", "FightingFlag", true), new scriptFunctionParam("int", "POVFlag", true), new scriptFunctionParam("int", "LookingFlag", true), new scriptFunctionParam("int", "RolloverTextFlag", true), new scriptFunctionParam("int", "SneakingFlag", true)], {docLink: "http://geck.bethsoft.com/index.php/EnablePlayerControls", name: "EnablePlayerControls"});
	dictionary.functions["disableplayercontrols"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("int", "MovementFlag", true), new scriptFunctionParam("int", "PipboyFlag", true), new scriptFunctionParam("int", "FightingFlag", true), new scriptFunctionParam("int", "POVFlag", true), new scriptFunctionParam("int", "LookingFlag", true), new scriptFunctionParam("int", "RolloverTextFlag", true), new scriptFunctionParam("int", "SneakingFlag", true)], {docLink: "http://geck.bethsoft.com/index.php/DisablePlayerControls", name: "DisablePlayerControls"});
	dictionary.functions["getplayercontrolsdisabled"] = new scriptFunction("bool", "B", 0, [new scriptFunctionParam("int", "MovementFlag", true), new scriptFunctionParam("int", "PipboyFlag", true), new scriptFunctionParam("int", "FightingFlag", true), new scriptFunctionParam("int", "POVFlag", true), new scriptFunctionParam("int", "LookingFlag", true), new scriptFunctionParam("int", "RolloverTextFlag", true), new scriptFunctionParam("int", "SneakingFlag", true)], {docLink: "http://geck.bethsoft.com/index.php/GetPlayerControlsDisabled", name: "GetPlayerControlsDisabled"}); //0, 1
	dictionary.functions["getheadingangle"] = new scriptFunction("float", "R", 0, [new scriptFunctionParam("ref", "ObjectID")], {docLink: "http://geck.bethsoft.com/index.php/GetHeadingAngle", name: "GetHeadingAngle"});
	dictionary.functions["pickidle"] = new scriptFunction("void", "R", 0, [], {name: "PickIdle"}); //Undocumented on GECK Wiki
	dictionary.functions["isweaponout"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsWeaponOut", name: "IsWeaponOut"}); //0, 1
	dictionary.functions["istorchout"] = new scriptFunction("void", "D", 0, [], {name: "IsTorchOut"});
	dictionary.functions["isshieldout"] = new scriptFunction("void", "D", 0, [], {name: "IsShieldOut"});
	dictionary.functions["createdetectionevent"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "ActorID"), new scriptFunctionParam("int", "SoundLevel"), new scriptFunctionParam("int", "EventType", true)], {docLink: "http://geck.bethsoft.com/index.php/CreateDetectionEvent", name: "CreateDetectionEvent"});
	dictionary.functions["isactionref"] = new scriptFunction("int", "B", 0, [new scriptFunctionParam("ref", "RefID")], {docLink: "http://geck.bethsoft.com/index.php/IsActionRef", name: "IsActionRef"}, [new scriptFunctionNote(
		function(functionCall) {
			return /"^(onactivate|ontriggerenter|ontriggerleave|ontrigger)$"/.test(script.inBlock.toLowerCase())
		},
		"\"IsActionRef\" is only useful inside an \"OnActivate\", \"OnTriggerEnter\", \"OnTriggerLeave\", or \"OnTrigger\" block",
		1)]); //0, 1
	dictionary.functions["isfacingup"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsFacingUp", name: "IsFacingUp"}); //0, 1
	dictionary.functions["getknockedstate"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetKnockedState", name: "GetKnockedState"}); //0, 1, 2
	dictionary.functions["getweaponanimtype"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetWeaponAnimType", name: "GetWeaponAnimType"}); //0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
	dictionary.functions["isweaponskilltype"] = new scriptFunction("int", "", 0, [], {name: "IsWeaponSkillType"}); //Undocumented on GECK Wiki //0, 1
	dictionary.functions["getcurrentaipackage"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetCurrentAIPackage", name: "GetCurrentAIPackage"}); //0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37
	dictionary.functions["iswaiting"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsWaiting", name: "IsWaiting"}); //0, 1
	dictionary.functions["isidleplaying"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsIdlePlaying", name: "IsIdlePlaying"}); //0, 1
	dictionary.functions["completequest"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("ref", "QuestID")], {docLink: "http://geck.bethsoft.com/index.php/CompleteQuest", name: "CompleteQuest"});
	dictionary.functions["lock"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("int", "Level", 0)], {docLink: "http://geck.bethsoft.com/index.php/Lock", name: "Lock"});
	dictionary.functions["unlock"] = new scriptFunction("void", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/Unlock", name: "Unlock"});
	dictionary.functions["getminorcrimecount"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetMinorCrimeCount", name: "GetMinorCrimeCount"}); //0+
	dictionary.functions["getmajorcrimecount"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetMajorCrimeCount", name: "GetMajorCrimeCount"}); //0+
	dictionary.functions["getactoraggroradiusviolated"] = new scriptFunction("int", "", 0, [], {name: "GetActorAggroRadiusViolated"}); //Undocumented on GECK Wiki //0, 1
	dictionary.functions["getcrimeknown"] = new scriptFunction("int", "", 0, [], {name: "GetCrimeKnown"}); //Undocumented on GECK Wiki //0, 1
	dictionary.functions["setenemy"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("ref", "Faction1"), new scriptFunctionParam("ref", "Faction2"), new scriptFunctionParam("int", "F1ToF2Flag"), new scriptFunctionParam("int", "F1ToF2Flag")], {docLink: "http://geck.bethsoft.com/index.php/SetEnemy", name: "SetEnemy"});
	dictionary.functions["setally"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("ref", "Faction1"), new scriptFunctionParam("ref", "Faction2"), new scriptFunctionParam("int", "F1ToF2Flag"), new scriptFunctionParam("int", "F1ToF2Flag")], {docLink: "http://geck.bethsoft.com/index.php/SetAlly", name: "SetAlly"});
	dictionary.functions["getcrime"] = new scriptFunction("int", "", 0, [], {name: "GetCrime"}); //Undocumented on GECK Wiki //0, 1
	dictionary.functions["isgreetingplayer"] = new scriptFunction("int", "", 0, [], {name: "IsGreetingPlayer"}); //Undocumented on GECK Wiki //0, 1
	dictionary.functions["startmistersandman"] = new scriptFunction("void", "", 0, [], {name: "StartMisterSandman"}); //Undocumented on GECK Wiki
	dictionary.functions["isguard"] = new scriptFunction("void", "D", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsGuard", name: "IsGuard"});
	dictionary.functions["startcannibal"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "TargetID")], {docLink: "http://geck.bethsoft.com/index.php/StartCannibal", name: "StartCannibal"});
	dictionary.functions["hasbeeneaten"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/HasBeenEaten", name: "HasBeenEaten"}); //0, 1
	dictionary.functions["getfatiguepercentage"] = new scriptFunction("float", "", 0, [], {name: "GetFatiguePercentage"}); //Undocumented on GECK Wiki //0-1
	dictionary.functions["getfatigue"] = new scriptFunction("float", "", 0, [], {name: "GetFatigue"}); //Undocumented on GECK Wiki //0+
	dictionary.functions["getpcisclass"] = new scriptFunction("int", "", 0, [], {name: "GetPCIsClass"}); //Undocumented on GECK Wiki //0, 1
	dictionary.functions["getpcisrace"] = new scriptFunction("int", "B", 0, [new scriptFunctionParam("ref", "RaceID")], {docLink: "http://geck.bethsoft.com/index.php/GetPCIsRace", name: "GetPCIsRace"}); //0, 1
	dictionary.functions["getpcissex"] = new scriptFunction("int", "R", 0, [new scriptFunctionParam("string", "Sex", false, {male: "Male", female: "Female"})], {docLink: "http://geck.bethsoft.com/index.php/GetPCIsSex", name: "GetPCIsSex"}); //0, 1
	dictionary.functions["getpcisinfaction"] = new scriptFunction("int", "", 0, [], {name: "GetPCIsInFaction"}); //Undocumented on GECK Wiki //0, 1
	dictionary.functions["samefactionaspc"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/SameFactionAsPC", name: "SameFactionAsPC"}); //0, 1
	dictionary.functions["sameraceaspc"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/SameRaceAsPC", name: "SameRaceAsPC"}); //0, 1
	dictionary.functions["samesexaspc"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/SameSexAsPC", name: "SameSexAsPC"}); //0, 1
	dictionary.functions["getisreference"] = new scriptFunction("int", "R", 0, [new scriptFunctionParam("ref", "RefID")], {docLink: "http://geck.bethsoft.com/index.php/GetIsReference", name: "GetIsReference"}); //0, 1
	dictionary.functions["setfactionrank"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "FactionID"), new scriptFunctionParam("int", "NewRank")], {docLink: "http://geck.bethsoft.com/index.php/SetFactionRank", name: "SetFactionRank"});
	dictionary.functions["modfactionrank"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "FactionID"), new scriptFunctionParam("int", "ModValue")], {docLink: "http://geck.bethsoft.com/index.php/ModFactionRank", name: "ModFactionRank"});
	dictionary.functions["killactor"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "KillerID", true), new scriptFunctionParam("int", "DismemberLimb", true), new scriptFunctionParam("int", "CauseOfDeath", true)], {docLink: "http://geck.bethsoft.com/index.php/KillActor", name: "KillActor", shortName: "Kill", longName: "KillActor"});
	dictionary.functions["kill"] = alias(dictionary.functions["killactor"]);
	dictionary.functions["resurrectactor"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("int", "AnimateFlag", true)], {docLink: "http://geck.bethsoft.com/index.php/ResurrectActor", name: "ResurrectActor", shortName: "Resurrect", longName: "ResurrectActor"});
	dictionary.functions["resurrect"] = alias(dictionary.functions["resurrectactor"]);
	dictionary.functions["istalking"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsTalking", name: "IsTalking"}); //0, 1
	dictionary.functions["getwalkspeed"] = new scriptFunction("float", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetWalkSpeed", name: "GetWalkSpeed", shortName: "GetWalk", longName: "GetWalkSpeed"});
	dictionary.functions["getwalk"] = alias(dictionary.functions["getwalkspeed"]);
	dictionary.functions["getcurrentaiprocedure"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetCurrentAIProcedure", name: "GetCurrentAIProcedure"}); //0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50
	dictionary.functions["gettrespasswarninglevel"] = new scriptFunction("int", "R", 0, [new scriptFunctionParam("int", "ActorID")], {docLink: "http://geck.bethsoft.com/index.php/GetTrespassWarningLevel", name: "GetTrespassWarningLevel"}); //0+
	dictionary.functions["istrespassing"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsTrespassing", name: "IsTrespassing"}); //0, 1
	dictionary.functions["isinmyownedcell"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsInMyOwnedCell", name: "IsInMyOwnedCell"}); //0, 1
	dictionary.functions["getwindspeed"] = new scriptFunction("float", "B", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetWindSpeed", name: "GetWindSpeed"}); //0-1
	dictionary.functions["getcurrentweatherpercent"] = new scriptFunction("float", "B", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetCurrentWeatherPercent", name: "GetCurrentWeatherPercent", shortName: "GetWeatherPct", longName: "GetCurrentWeatherPercent"}); //0-1
	dictionary.functions["getweatherpct"] = alias(dictionary.functions["getcurrentweatherpercent"]); //0-1
	dictionary.functions["getiscurrentweather"] = new scriptFunction("int", "B", 0, [new scriptFunctionParam("ref", "WeatherID")], {docLink: "http://geck.bethsoft.com/index.php/GetIsCurrentWeather", name: "GetIsCurrentWeather", shortName: "GetWeather", longName: "GetIsCurrentWeather"}); //0, 1
	dictionary.functions["getweather"] = alias(dictionary.functions["getiscurrentweather"]);
	dictionary.functions["iscontinuingpackagepcnear"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsContinuingPackagePCNear", name: "IsContinuingPackagePCNear"}); //0, 1
	dictionary.functions["addscriptpackage"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "PackageID")], {docLink: "http://geck.bethsoft.com/index.php/AddScriptPackage", name: "AddScriptPackage"});
	dictionary.functions["removescriptpackage"] = new scriptFunction("void", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/RemoveScriptPackage", name: "RemoveScriptPackage"});
	dictionary.functions["canhaveflames"] = new scriptFunction("int", "", 0, [], {name: "CanHaveFlames"}); //Undocumented on GECK Wiki //0, 1
	dictionary.functions["hasflames"] = new scriptFunction("int", "", 0, [], {name: "HasFlames"}); //Undocumented on GECK Wiki //0, 1
	dictionary.functions["addflames"] = new scriptFunction("void", "", 0, [], {name: "AddFlames"}); //Undocumented on GECK Wiki
	dictionary.functions["removeflames"] = new scriptFunction("void", "", 0, [], {name: "RemoveFlames"}); //Undocumented on GECK Wiki
	dictionary.functions["getopenstate"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetOpenState", name: "GetOpenState"}); //0, 1, 2, 3, 4
	dictionary.functions["movetomarker"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "MarkerID"), new scriptFunctionParam("float", "OffsetX", true), new scriptFunctionParam("float", "OffsetY", true), new scriptFunctionParam("float", "OffsetZ", true)], {docLink: "http://geck.bethsoft.com/index.php/MoveToMarker", name: "MoveToMarker", shortName: "MoveTo", longName: "MoveToMarker"});
	dictionary.functions["moveto"] = alias(dictionary.functions["movetomarker"]);
	dictionary.functions["getsitting"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetSitting", name: "GetSitting"}); //0, 1, 2, 3, 4
	dictionary.functions["getfurnituremarkerid"] = new scriptFunction("int", "", 0, [], {name: "GetFurnitureMarkerID"}); //Undocumented on GECK Wiki
	dictionary.functions["getiscurrentpackage"] = new scriptFunction("int", "R", 0, [new scriptFunctionParam("ref", "PackageID")], {docLink: "http://geck.bethsoft.com/index.php/GetIsCurrentPackage", name: "GetIsCurrentPackage"}); //0, 1
	dictionary.functions["iscurrentfurnitureref"] = new scriptFunction("int", "R", 0, [new scriptFunctionParam("ref", "FurnitureRefID")], {docLink: "http://geck.bethsoft.com/index.php/IsCurrentFurnitureRef", name: "IsCurrentFurnitureRef"}); //0, 1
	dictionary.functions["iscurrentfurnitureobj"] = new scriptFunction("int", "R", 0, [new scriptFunctionParam("ref", "FurnitureID")], {docLink: "http://geck.bethsoft.com/index.php/IsCurrentFurnitureObj", name: "IsCurrentFurnitureObj"}); //0, 1
	dictionary.functions["setsize"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("float", "Size")], {docLink: "http://geck.bethsoft.com/index.php/SetSize", name: "SetSize", shortName: "CSize", longName: "SetSize"});
	dictionary.functions["csize"] = alias(dictionary.functions["setsize"]);
	dictionary.functions["removeme"] = new scriptFunction("void", "S", 0, [new scriptFunctionParam("ref", "TargetContainerID", true)], {docLink: "http://geck.bethsoft.com/index.php/RemoveMe", name: "RemoveMe"});
	dictionary.functions["dropme"] = new scriptFunction("void", "S", 0, [], {docLink: "http://geck.bethsoft.com/index.php/DropMe", name: "DropMe"});
	dictionary.functions["getfactionreaction"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("ref", "Faction1"), new scriptFunctionParam("ref", "Faction2")], {docLink: "http://geck.bethsoft.com/index.php/GetFactionReaction", name: "GetFactionReaction"});
	dictionary.functions["setfactionreaction"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("ref", "Faction1"), new scriptFunctionParam("ref", "Faction2"), new scriptFunctionParam("float", "ReactionValue")], {docLink: "http://geck.bethsoft.com/index.php/SetFactionReaction", name: "SetFactionReaction"});
	dictionary.functions["modfactionreaction"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("ref", "Faction1"), new scriptFunctionParam("ref", "Faction2"), new scriptFunctionParam("float", "ModValue")], {docLink: "http://geck.bethsoft.com/index.php/ModFactionReaction", name: "ModFactionReaction"});
	dictionary.functions["getdayofweek"] = new scriptFunction("int", "B", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetDayOfWeek", name: "GetDayOfWeek"}); //0, 1, 2, 3, 4, 5, 6
	dictionary.functions["ignorecrime"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("int", "Flag")], {docLink: "http://geck.bethsoft.com/index.php/IgnoreCrime", name: "IgnoreCrime"});
	dictionary.functions["gettalkedtopcparam"] = new scriptFunction("int", "", 0, [], {name: "GetTalkedToPCParam"}); //Undocumented on GECK Wiki //0, 1
	dictionary.functions["removeallitems"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "TargetContainerID", true), new scriptFunctionParam("int", "RetainOwnerShipFlag", true)], {docLink: "http://geck.bethsoft.com/index.php/RemoveAllItems", name: "RemoveAllItems"});
	dictionary.functions["wakeuppc"] = new scriptFunction("void", "B", 0, [], {docLink: "http://geck.bethsoft.com/index.php/WakeUpPC", name: "WakeUpPC"});
	dictionary.functions["ispcsleeping"] = new scriptFunction("int", "B", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsPCSleeping", name: "IsPCSleeping"}); //0, 1
	dictionary.functions["ispcamurderer"] = new scriptFunction("int", "B", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsPCAMurderer", name: "IsPCAMurderer"}); //0, 1
	dictionary.functions["setcombatstyle"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "CombatStyleID")], {docLink: "http://geck.bethsoft.com/index.php/SetCombatStyle", name: "SetCombatStyle", shortName: "SetCS", longName: "SetCombatStyle"});
	dictionary.functions["setcs"] = alias(dictionary.functions["setcombatstyle"]);
	dictionary.functions["playsound3d"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("ref", "SoundID")], {docLink: "http://geck.bethsoft.com/index.php/PlaySound3D", name: "PlaySound3D"});
	dictionary.functions["selectplayerspell"] = new scriptFunction("void", "D", 0, [], {name: "SelectPlayerSpell", shortName: "SPSpell", longName: "SelectPlayerSpell"});
	dictionary.functions["spspell"] = alias(dictionary.functions["selectplayerspell"]);
	dictionary.functions["getdetectionlevel"] = new scriptFunction("int", "R", 0, [new scriptFunctionParam("ref", "ActorID")], {docLink: "http://geck.bethsoft.com/index.php/GetDetectionLevel", name: "GetDetectionLevel"}); //0, 1, 2, 3
	dictionary.functions["isactordetected"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsActorDetected", name: "IsActorDetected"}, [new scriptFunctionNote(
		function(functionCall) {
			if (0 in functionCall) {
				return functionCall[0].toLowerCase in {player: 1, playerref: 1}
			} else
				return false;
		},
		"\"IsActorDetected\" will always return 0 when called on the player",
		1)]); //0, 1
	dictionary.functions["getequipped"] = new scriptFunction("int", "R", 0, [new scriptFunctionParam("ref", "ObjectID")], {docLink: "http://geck.bethsoft.com/index.php/GetEquipped", name: "GetEquipped"}); //0, 1
	dictionary.functions["wait"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "PackageID")], {docLink: "http://geck.bethsoft.com/index.php/Wait", name: "Wait"});
	dictionary.functions["stopwaiting"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "PackageID")], {docLink: "http://geck.bethsoft.com/index.php/StopWaiting", name: "StopWaiting"});
	dictionary.functions["isswimming"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsSwimming", name: "IsSwimming"}); //0, 1
	dictionary.functions["scripteffectelapsedseconds"] = new scriptFunction("float", "B", 0, [], {docLink: "http://geck.bethsoft.com/index.php/ScriptEffectElapsedSeconds", name: "ScriptEffectElapsedSeconds"}, [new scriptFunctionNote(
		function(functionCall) {return script.inBlock.toLowerCase() != "scripteffectupdate";}, "\"ScriptEffectElapsedSeconds\" will only return a value other than 0 inside a \"ScriptEffectUpdate\" block", 1)]);
	dictionary.functions["setcellpublicflag"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("ref", "CellID"), new scriptFunctionParam("int", "Flag")], {docLink: "http://geck.bethsoft.com/index.php/SetCellPublicFlag", name: "SetCellPublicFlag", shortName: "SetPublic", longName: "SetCellPublicFlag"});
	dictionary.functions["setpublic"] = alias(dictionary.functions["setcellpublicflag"]);
	dictionary.functions["getpcsleephours"] = new scriptFunction("int", "B", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetPCSleepHours", name: "GetPCSleepHours"}); //0+
	dictionary.functions["setpcsleephours"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("int", "Hours")], {docLink: "http://geck.bethsoft.com/index.php/SetPCSleepHours", name: "SetPCSleepHours"});
	dictionary.functions["getamountsoldstolen"] = new scriptFunction("void", "D", 0, [], {name: "GetAmountSoldStolen"});
	dictionary.functions["modamountsoldstolen"] = new scriptFunction("void", "D", 0, [], {name: "ModAmountSoldStolen"});
	dictionary.functions["getignorecrime"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetIgnoreCrime", name: "GetIgnoreCrime"}); //0, 1
	dictionary.functions["getpcexpelled"] = new scriptFunction("int", "D", 0, [], {name: "GetPCExpelled"}); //0, 1
	dictionary.functions["setpcexpelled"] = new scriptFunction("void", "D", 0, [], {name: "SetPCExpelled"});
	dictionary.functions["getpcfactionmurder"] = new scriptFunction("int", "", 0, [], {name: "GetPCFactionMurder"}); //Undocumented on GECK Wiki //0, 1
	dictionary.functions["setpcfactionmurder"] = new scriptFunction("void", "", 0, [], {name: "SetPCFactionMurder"}); //Undocumented on GECK Wiki
	dictionary.functions["getpcenemyoffaction"] = new scriptFunction("int", "", 0, [], {name: "GetPCEnemyOfFaction"}); //Undocumented on GECK Wiki //0, 1
	dictionary.functions["setpcenemyoffaction"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("ref", "FactionID"), new scriptFunctionParam("in", "Flag")], {docLink: "http://geck.bethsoft.com/index.php/SetPCEnemyOfFaction", name: "SetPCEnemyOfFaction"});
	dictionary.functions["getpcfactionattack"] = new scriptFunction("int", "", 0, [], {name: "GetPCFactionAttack"}); //Undocumented on GECK Wiki //0, 1
	dictionary.functions["setpcfactionattack"] = new scriptFunction("void", "", 0, [], {name: "SetPCFactionAttack"}); //Undocumented on GECK Wiki
	dictionary.functions["unusedfunction21"] = new scriptFunction("void", "D", 0, [], {name: "UnusedFunction21"});
	dictionary.functions["unusedfunction22"] = new scriptFunction("void", "D", 0, [], {name: "UnusedFunction22"});
	dictionary.functions["getdestroyed"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetDestroyed", name: "GetDestroyed"}); //0, 1
	dictionary.functions["setdestroyed"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("int", "Flag")], {docLink: "http://geck.bethsoft.com/index.php/SetDestroyed", name: "SetDestroyed"});
	dictionary.functions["getactionref"] = new scriptFunction("ref", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetActionRef", name: "GetActionRef", shortName: "GetAR", longName: "GetActionRef"}, [new scriptFunctionNote(
		function(functionCall) {
			return /"^(onactivate|ontriggerenter|ontriggerleave|ontrigger)$"/.test(script.inBlock.toLowerCase())
		},
		"GetActionRef is only useful inside an \"OnActivate\", \"OnTriggerEnter\", \"OnTriggerLeave\", or \"OnTrigger\" block",
		1)]);
	dictionary.functions["getar"] = alias(dictionary.functions["getactionref"]);
	dictionary.functions["getself"] = new scriptFunction("ref", "S", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetSelf", name: "GetSelf", shortName: "This", longName: "GetSelf"}, [new scriptFunctionNote(
		function(functionCall) {return true;},
		"When called on references created dynamically (for example, via PlaceAtMe), GetSelf will always return 0",
		0)]);
	dictionary.functions["this"] = alias(dictionary.functions["getself"]);
	dictionary.functions["getcontainer"] = new scriptFunction("ref", "S", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetContainer", name: "GetContainer"});
	dictionary.functions["getforcerun"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetForceRun", name: "GetForceRun"}); //0, 1
	dictionary.functions["setforcerun"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("int", "Flag")], {docLink: "http://geck.bethsoft.com/index.php/SetForceRun", name: "SetForceRun"});
	dictionary.functions["getforcesneak"] = new scriptFunction("int", "R", 0, [], {name: "GetForceSneak"}); //Undocumented on GECK Wiki //0, 1
	dictionary.functions["setforcesneak"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("int", "Flag")], {docLink: "http://geck.bethsoft.com/index.php/SetForceSneak", name: "SetForceSneak"});
	dictionary.functions["advancepcskill"] = new scriptFunction("void");
	dictionary.functions["advskill"] = alias(dictionary.functions["advancepcskill"]); //Undocumented on GECK Wiki
	dictionary.functions["advancepclevel"] = new scriptFunction("void");
	dictionary.functions["advlevel"] = alias(dictionary.functions["advancepclevel"]);
	dictionary.functions["hasmagiceffect"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getdefaultopen"] = new scriptFunction("int"); //0, 1
	dictionary.functions["setdefaultopen"] = new scriptFunction("void");
	dictionary.functions["showclassmenu"] = new scriptFunction("void");
	dictionary.functions["showracemenu"] = new scriptFunction("void");
	dictionary.functions["getanimaction"] = new scriptFunction("int"); //0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13
	dictionary.functions["shownamemenu"] = new scriptFunction("void");
	dictionary.functions["setopenstate"] = new scriptFunction("void");
	dictionary.functions["unusedfunction26"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["isspelltarget"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getvatsmode"] = new scriptFunction("int"); //0, 1, 2, 3, 4
	dictionary.functions["getpersuasionnumber"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["getsandman"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getcannibal"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getisclassdefault"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getclassdefaultmatch"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getincellparam"] = new scriptFunction("int"); //0, 1
	dictionary.functions["setinchargen"] = new scriptFunction("void");
	dictionary.functions["getcombattarget"] = new scriptFunction("ref");
	dictionary.functions["getpackagetarget"] = new scriptFunction("ref");
	dictionary.functions["showspellmaking"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["getvatstargetheight"] = new scriptFunction("float");
	dictionary.functions["setghost"] = new scriptFunction("void");
	dictionary.functions["getisghost"] = new scriptFunction("int"); //0, 1
	dictionary.functions["equipitem"] = new scriptFunction("void");
	dictionary.functions["equipobject"] = alias(dictionary.functions["equipitem"]);
	dictionary.functions["unequipitem"] = new scriptFunction("void");
	dictionary.functions["unequipobject"] = alias(dictionary.functions["unequipitem"]);
	dictionary.functions["setclass"] = new scriptFunction("void");
	dictionary.functions["setunconscious"] = new scriptFunction("void");
	dictionary.functions["getunconscious"] = new scriptFunction("int"); //0, 1
	dictionary.functions["setrestrained"] = new scriptFunction("void");
	dictionary.functions["getrestrained"] = new scriptFunction("int"); //0, 1
	dictionary.functions["forceflee"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["flee"] = alias(dictionary.functions["forceflee"]);
	dictionary.functions["getisuseditem"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getisuseditemtype"] = new scriptFunction("int"); //0, 1
	dictionary.functions["unusedfunction9"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["unusedfunction10"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["unusedfunction11"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["unusedfunction12"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["unusedfunction13"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["unusedfunction14"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["getisplayablerace"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getoffersservicesnow"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getgamesetting"] = new scriptFunction("depends"); //Depends on target
	dictionary.functions["getgs"] = alias(dictionary.functions["getgamesetting"]); //Depends on target
	dictionary.functions["stopcombatalarmonactor"] = new scriptFunction("void");
	dictionary.functions["scaonactor"] = alias(dictionary.functions["stopcombatalarmonactor"]);
	dictionary.functions["getuseditemlevel"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getuseditemactivate"] = new scriptFunction("unknown");
	dictionary.functions["setweather"] = new scriptFunction("void");
	dictionary.functions["sw"] = alias(dictionary.functions["setweather"]);
	dictionary.functions["forcetakecover"] = new scriptFunction("void");
	dictionary.functions["takecover"] = alias(dictionary.functions["forcetakecover"]);
	dictionary.functions["modbartergold"] = new scriptFunction("void");
	dictionary.functions["setbartergold"] = new scriptFunction("void");
	dictionary.functions["getbartergold"] = new scriptFunction("int"); //0+
	dictionary.functions["istimepassing"] = new scriptFunction("int"); //0, 1
	dictionary.functions["ispleasant"] = new scriptFunction("int"); //0, 1
	dictionary.functions["iscloudy"] = new scriptFunction("int"); //0, 1
	dictionary.functions["trapupdate"] = new scriptFunction("void");
	dictionary.functions["setquestobject"] = new scriptFunction("void");
	dictionary.functions["forceactorvalue"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("string", "StatName", false, dictionary.values.actorValues), new scriptFunctionParam("float", "Value")], {docLink: "http://geck.bethsoft.com/index.php/ForceActorValue", name: "ForceActorValue", shortName: "ForceAV", longName: "ForceActorValue"});
	dictionary.functions["forceav"] = alias(dictionary.functions["forceactorvalue"]);
	dictionary.functions["modpcskill"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("string", "StatName", false, dictionary.values.skills), new scriptFunctionParam("float", "Value")], {docLink: "http://geck.bethsoft.com/index.php/ModPCSkill", name: "ModPCSkill", shortName: "ModPCS", longName: "ModPCSkill"});
	dictionary.functions["modpcs"] = alias(dictionary.functions["modpcskill"]);
	dictionary.functions["modpcattribute"] = new scriptFunction("void", "B", 0, [new scriptFunctionParam("string", "StatName", false, dictionary.values.attributes), new scriptFunctionParam("float", "Value")], {docLink: "http://geck.bethsoft.com/index.php/ModPCAttribute", name: "ModPCAttribute", shortName: "ModPCA", longName: "ModPCAttribute"});
	dictionary.functions["modpca"] = alias(dictionary.functions["modpcattribute"]);
	dictionary.functions["enablefasttravel"] = new scriptFunction("void");
	dictionary.functions["enablefast"] = alias(dictionary.functions["enablefasttravel"]);
	dictionary.functions["getarmorratingupperbody"] = new scriptFunction("int"); //0-100
	dictionary.functions["getparentref"] = new scriptFunction("ref");
	dictionary.functions["playbink"] = new scriptFunction("void");
	dictionary.functions["getbaseactorvalue"] = new scriptFunction("int"); //0-100
	dictionary.functions["getbaseav"] = alias(dictionary.functions["getbaseactorvalue"]) //0-100
	dictionary.functions["isowner"] = new scriptFunction("int"); //0, 1
	dictionary.functions["setownership"] = new scriptFunction("void");
	dictionary.functions["iscellowner"] = new scriptFunction("int"); //0, 1
	dictionary.functions["setcellownership"] = new scriptFunction("void");
	dictionary.functions["ishorsestolen"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["setcellfullname"] = new scriptFunction("void");
	dictionary.functions["setactorfullname"] = new scriptFunction("void");
	dictionary.functions["isleftup"] = new scriptFunction("int"); //0, 1
	dictionary.functions["issneaking"] = new scriptFunction("int"); //0, 1
	dictionary.functions["isrunning"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getfriendhit"] = new scriptFunction("int"); //0+
	dictionary.functions["isincombat"] = new scriptFunction("int"); //0, 1
	dictionary.functions["setpackduration"] = new scriptFunction("void");
	dictionary.functions["spdur"] = alias(dictionary.functions["setpackduration"]);
	dictionary.functions["playmagicshadervisuals"] = new scriptFunction("void");
	dictionary.functions["pms"] = alias(dictionary.functions["playmagicshadervisuals"]);
	dictionary.functions["playmagiceffectvisuals"] = new scriptFunction("void");
	dictionary.functions["pme"] = alias(dictionary.functions["playmagiceffectvisuals"]);
	dictionary.functions["stopmagicshadervisuals"] = new scriptFunction("void");
	dictionary.functions["sms"] = alias(dictionary.functions["stopmagicshadervisuals"]);
	dictionary.functions["stopmagiceffectvisuals"] = new scriptFunction("void");
	dictionary.functions["sme"] = alias(dictionary.functions["stopmagiceffectvisuals"]);
	dictionary.functions["resetinterior"] = new scriptFunction("void");
	dictionary.functions["isanimplaying"] = new scriptFunction("int"); //0, 1
	dictionary.functions["setactoralpha"] = new scriptFunction("void");
	dictionary.functions["saa"] =dictionary.functions["setactoralpha"];
	dictionary.functions["enablelinkedpathpoints"] = new scriptFunction("void");
	dictionary.functions["disablelinkedpathpoints"] = new scriptFunction("void");
	dictionary.functions["isininterior"] = new scriptFunction("int"); //0, 1
	dictionary.functions["forceweather"] = new scriptFunction("void");
	dictionary.functions["fw"] = alias(dictionary.functions["forceweather"]);
	dictionary.functions["toggleactorsai"] = new scriptFunction("void");
	dictionary.functions["isactorsaioff"] = new scriptFunction("int"); //0, 1
	dictionary.functions["iswaterobject"] = new scriptFunction("int"); //0, 1
	dictionary.functions["unusedfunction15"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["isactorusingatorch"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["setlevel"] = new scriptFunction("void");
	dictionary.functions["resetfalldamagetimer"] = new scriptFunction("void");
	dictionary.functions["isxbox"] = new scriptFunction("int", "B", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsXBox", name: "IsXBox"}, [new scriptFunctionNote(
		function(functionCall) {return true;},
		"\"IsXBox\" will always return 0",
		1)]); //0
	dictionary.functions["getinworldspace"] = new scriptFunction("int"); //0, 1
	dictionary.functions["modpcmiscstat"] = new scriptFunction("void");
	dictionary.functions["modpcms"] = alias(dictionary.functions["modpcmiscstat"]);
	dictionary.functions["getpcmiscstat"] = new scriptFunction("int"); //0+
	dictionary.functions["getpcms"] = alias(dictionary.functions["getpcmiscstat"]); //0+
	dictionary.functions["isactorevil"] = new scriptFunction("int"); //0, 1
	dictionary.functions["isactoravictim"] = new scriptFunction("int"); //0, 1
	dictionary.functions["gettotalpersuasionnumber"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["setscale"] = new scriptFunction("void");
	dictionary.functions["modscale"] = new scriptFunction("void");
	dictionary.functions["getidledoneonce"] = new scriptFunction("int"); //0, 1
	dictionary.functions["killallactors"] = new scriptFunction("void");
	dictionary.functions["killall"] = alias(dictionary.functions["killallactors"]);
	dictionary.functions["getnorumors"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["setnorumors"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["dispel"] = new scriptFunction("void");
	dictionary.functions["whichservicemenu"] = new scriptFunction("int"); //0, 1
	dictionary.functions["triggerhitshader"] = new scriptFunction("void");
	dictionary.functions["ths"] = alias(dictionary.functions["triggerhitshader"]);
	dictionary.functions["unusedfunction16"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["reset3dstate"] = new scriptFunction("void");
	dictionary.functions["isridinghorse"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["dispelallspells"] = new scriptFunction("void");
	dictionary.functions["unusedfunction17"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["addachievement"] = new scriptFunction("void");
	dictionary.functions["duplicateallitems"] = new scriptFunction("void");
	dictionary.functions["isindangerouswater"] = new scriptFunction("int"); //0, 1
	dictionary.functions["essentialdeathreload"] = new scriptFunction("void");
	dictionary.functions["setshowquestitems"] = new scriptFunction("void");
	dictionary.functions["duplicatenpcstats"] = new scriptFunction("void");
	dictionary.functions["resethealth"] = new scriptFunction("void");
	dictionary.functions["setignorefriendlyhits"] = new scriptFunction("void");
	dictionary.functions["sifh"] = alias(dictionary.functions["setignorefriendlyhits"]);
	dictionary.functions["getignorefriendlyhits"] = new scriptFunction("int"); //0, 1
	dictionary.functions["gifh"] = alias(dictionary.functions["getignorefriendlyhits"]); //0, 1
	dictionary.functions["isplayerslastriddenhorse"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["setactorrefraction"] = new scriptFunction("void");
	dictionary.functions["sar"] = alias(dictionary.functions["setactorrefraction"]);
	dictionary.functions["setitemvalue"] = new scriptFunction("void");
	dictionary.functions["setrigidbodymass"] = new scriptFunction("void");
	dictionary.functions["showviewerstrings"] = new scriptFunction("void");
	dictionary.functions["svs"] = alias(dictionary.functions["showviewerstrings"]);
	dictionary.functions["releaseweatheroverride"] = new scriptFunction("void");
	dictionary.functions["rwo"] = alias(dictionary.functions["releaseweatheroverride"]);
	dictionary.functions["setallreachable"] = new scriptFunction("void");
	dictionary.functions["setallvisible"] = new scriptFunction("void");
	dictionary.functions["setnoavoidance"] = new scriptFunction("void");
	dictionary.functions["sendtrespassalarm"] = new scriptFunction("void");
	dictionary.functions["setsceneiscomplex"] = new scriptFunction("void");
	dictionary.functions["autosave"] = new scriptFunction("void");
	dictionary.functions["startmasterfileseekdata"] = new scriptFunction("void");
	dictionary.functions["dumpmasterfileseekdata"] = new scriptFunction("void");
	dictionary.functions["isactor"] = new scriptFunction("int"); //0, 1
	dictionary.functions["isessential"] = new scriptFunction("int"); //0, 1
	dictionary.functions["preloadmagiceffect"] = new scriptFunction("void");
	dictionary.functions["showdialogsubtitles"] = new scriptFunction("void");
	dictionary.functions["unusedfunction27"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["isplayermovingintonewspace"] = new scriptFunction("int"); //0, 1
	dictionary.functions["unusedfunction28"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["unusedfunction29"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["gettimedead"] = new scriptFunction("float"); //0+
	dictionary.functions["getplayerhaslastriddenhorse"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["getlinkedref"] = new scriptFunction("ref");
	dictionary.functions["damageobject"] = new scriptFunction("void");
	dictionary.functions["do"] = alias(dictionary.functions["damageobject"]);
	dictionary.functions["ischild"] = new scriptFunction("int"); //0, 1
	dictionary.functions["unusedfunction1"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["getlastplayeraction"] = new scriptFunction("int"); //1, 2, 3, 4, 5, 6, 7, 8, 9, 10
	dictionary.functions["isplayeractionactive"] = new scriptFunction("int"); //0, 1
	dictionary.functions["settalkingactivatoractor"] = new scriptFunction("void");
	dictionary.functions["istalkingactivatoractor"] = new scriptFunction("int"); //0, 1
	dictionary.functions["showbartermenu"] = new scriptFunction("void");
	dictionary.functions["sbm"] = alias(dictionary.functions["showbartermenu"]);
	dictionary.functions["isinlist"] = new scriptFunction("int"); //0, 1
	dictionary.functions["unusedfunction18"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["addperk"] = new scriptFunction("void");
	dictionary.functions["rewardxp"] = new scriptFunction("void");
	dictionary.functions["showhackingminigame"] = new scriptFunction("void");
	dictionary.functions["shmg"] = alias(dictionary.functions["showhackingminigame"]);
	dictionary.functions["showsurgerymenu"] = new scriptFunction("void");
	dictionary.functions["ssmg"] = alias(dictionary.functions["showsurgerymenu"]);
	dictionary.functions["showrepairmenu"] = new scriptFunction("void");
	dictionary.functions["srm"] = alias(dictionary.functions["showrepairmenu"]);
	dictionary.functions["functionunused19"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["unused"] = alias(dictionary.functions["functionunused19"]);
	dictionary.functions["addnote"] = new scriptFunction("void");
	dictionary.functions["an"] = alias(dictionary.functions["addnote"]);
	dictionary.functions["removenote"] = new scriptFunction("void");
	dictionary.functions["rn"] = alias(dictionary.functions["removenote"]);
	dictionary.functions["gethasnote"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getn"] = alias(dictionary.functions["gethasnote"]); //0, 1
	dictionary.functions["addtofaction"] = new scriptFunction("void");
	dictionary.functions["addfac"] = alias(dictionary.functions["addtofaction"]);
	dictionary.functions["removefromfaction"] = new scriptFunction("void");
	dictionary.functions["removefac"] = alias(dictionary.functions["removefromfaction"]);
	dictionary.functions["damageactorvalue"] = new scriptFunction("void");
	dictionary.functions["damageav"] = alias(dictionary.functions["damageactorvalue"]);
	dictionary.functions["restoreactorvalue"] = new scriptFunction("void");
	dictionary.functions["restoreav"] = alias(dictionary.functions["restoreactorvalue"]);
	dictionary.functions["triggerhudshudder"] = new scriptFunction("void");
	dictionary.functions["hudsh"] = alias(dictionary.functions["triggerhudshudder"]);
	dictionary.functions["setdisposition"] = new scriptFunction("void");
	dictionary.functions["setdisp"] = alias(dictionary.functions["setdisposition"]);
	dictionary.functions["showcomputersinterface"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["sci"] = alias(dictionary.functions["showcomputersinterface"]);
	dictionary.functions["setglobaltimemultiplier"] = new scriptFunction("void");
	dictionary.functions["sgtm"] = alias(dictionary.functions["setglobaltimemultiplier"]);
	dictionary.functions["gethitlocation"] = new scriptFunction("int"); //0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14
	dictionary.functions["ispc1stperson"] = new scriptFunction("int"); //0, 1
	dictionary.functions["pc1st"] = alias(dictionary.functions["ispc1stperson"]); //0, 1
	dictionary.functions["purgecellbuffers"] = new scriptFunction("void");
	dictionary.functions["pcb"] = alias(dictionary.functions["purgecellbuffers"]);
	dictionary.functions["pushactoraway"] = new scriptFunction("void");
	dictionary.functions["setactorsai"] = new scriptFunction("void");
	dictionary.functions["clearownership"] = new scriptFunction("void");
	dictionary.functions["getcauseofdeath"] = new scriptFunction("int"); //-1, 0, 2, 3, 4, 5, 6, 7
	dictionary.functions["islimbgone"] = new scriptFunction("int"); //0, 1
	dictionary.functions["isweaponinlist"] = new scriptFunction("int"); //0, 1
	dictionary.functions["playidle"] = new scriptFunction("void");
	dictionary.functions["applyimagespacemodifier"] = new scriptFunction("void");
	dictionary.functions["imod"] = alias(dictionary.functions["applyimagespacemodifier"]);
	dictionary.functions["removeimagespacemodifier"] = new scriptFunction("void");
	dictionary.functions["rimod"] = alias(dictionary.functions["removeimagespacemodifier"]);
	dictionary.functions["hasfrienddisposition"] = new scriptFunction("int"); //0, 1
	dictionary.functions["functionunused20"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["frienddispositionboost"] = new scriptFunction("void");
	dictionary.functions["setcellimagespace"] = new scriptFunction("void");
	dictionary.functions["showchargenmenu"] = new scriptFunction("void");
	dictionary.functions["scgm"] = alias(dictionary.functions["showchargenmenu"]);
	dictionary.functions["getvatsvalue"] = new scriptFunction("int"); //0, 1
	dictionary.functions["iskiller"] = new scriptFunction("int"); //0, 1
	dictionary.functions["iskillerobject"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getfactioncombatreaction"] = new scriptFunction("unknown");
	dictionary.functions["useweapon"] = new scriptFunction("void");
	dictionary.functions["evaluatespellconditions"] = new scriptFunction("void");
	dictionary.functions["esc"] = alias(dictionary.functions["evaluatespellconditions"]);
	dictionary.functions["togglemotionblur"] = new scriptFunction("void");
	dictionary.functions["tmb"] = alias(dictionary.functions["togglemotionblur"]);
	dictionary.functions["exists"] = new scriptFunction("int", "R", 0, [new scriptFunctionParam("ref", "Target", 0)], {docLink: "http://geck.bethsoft.com/index.php/Exists", name: "Exists"}, [new scriptFunctionNote(
		function(functionCall) {return true;},
		"\"Exists\" is a condition function only.  Use \"GetIsReference\" to compare two references",
		1)]); //0, 1
	dictionary.functions["getgroupmembercount"] = new scriptFunction("int"); //0+
	dictionary.functions["getgrouptargetcount"] = new scriptFunction("int"); //0+
	dictionary.functions["setobjectivecompleted"] = new scriptFunction("void");
	dictionary.functions["setobjectivedisplayed"] = new scriptFunction("void");
	dictionary.functions["getobjectivecompleted"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getobjectivedisplayed"] = new scriptFunction("int"); //0, 1
	dictionary.functions["setimagespace"] = new scriptFunction("void");
	dictionary.functions["pipboyradio"] = new scriptFunction("void");
	dictionary.functions["prad"] = alias(dictionary.functions["pipboyradio"]);
	dictionary.functions["removeperk"] = new scriptFunction("void");
	dictionary.functions["disableallactors"] = new scriptFunction("void");
	dictionary.functions["disaa"] = alias(dictionary.functions["disableallactors"]);
	dictionary.functions["getisformtype"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getisvoicetype"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getplantedexplosive"] = new scriptFunction("unknown");
	dictionary.functions["completeallobjectives"] = new scriptFunction("void");
	dictionary.functions["isactortalkingthroughactivator"] = new scriptFunction("int"); //0, 1
	dictionary.functions["gethealthpercentage"] = new scriptFunction("float"); //0-1
	dictionary.functions["setaudiomultithreading"] = new scriptFunction("void");
	dictionary.functions["sam"] = alias(dictionary.functions["setaudiomultithreading"]);
	dictionary.functions["getisobjecttype"] = new scriptFunction("int"); //0, 1
	dictionary.functions["showchargenmenuparams"] = new scriptFunction("void");
	dictionary.functions["scgmp"] = alias(dictionary.functions["showchargenmenuparams"]);
	dictionary.functions["getdialogueemotion"] = new scriptFunction("unknown");
	dictionary.functions["getdialogueemotionvalue"] = new scriptFunction("unknown");
	dictionary.functions["exitgame"] = new scriptFunction("void");
	dictionary.functions["exit"] = alias(dictionary.functions["exitgame"]);
	dictionary.functions["getiscreaturetype"] = new scriptFunction("int"); //0, 1
	dictionary.functions["setmerchantcontainer"] = new scriptFunction("void");
	dictionary.functions["removemerchantcontainer"] = new scriptFunction("void");
	dictionary.functions["showwarning"] = new scriptFunction("void", "D", 0, [new scriptFunctionParam("ref", "Message", 0)], {docLink: "http://geck.bethsoft.com/index.php/ShowWarning", name: "ShowWarning"});
	dictionary.functions["entertrigger"] = new scriptFunction("void");
	dictionary.functions["markfordelete"] = new scriptFunction("void");
	dictionary.functions["additemhealthpercent"] = new scriptFunction("void");
	dictionary.functions["placeatmehealthpercent"] = new scriptFunction("ref");
	dictionary.functions["getinzone"] = new scriptFunction("int"); //0, 1
	dictionary.functions["disablenavmesh"] = new scriptFunction("void");
	dictionary.functions["enablenavmesh"] = new scriptFunction("void");
	dictionary.functions["hasperk"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getfactionrelation"] = new scriptFunction("int"); //0, 1, 2, 3
	dictionary.functions["islastidleplayed"] = new scriptFunction("int"); //0, 1
	dictionary.functions["setnpcradio"] = new scriptFunction("void");
	dictionary.functions["snr"] = alias(dictionary.functions["setnpcradio"]);
	dictionary.functions["setplayerteammate"] = new scriptFunction("void");
	dictionary.functions["getplayerteammate"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getplayerteammatecount"] = new scriptFunction("int"); //0+
	dictionary.functions["openteammatecontainer"] = new scriptFunction("void");
	dictionary.functions["clearfactionplayerenemyflag"] = new scriptFunction("void");
	dictionary.functions["getactorcrimeplayerenemy"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getactorfactionplayerenemy"] = new scriptFunction("int"); //0, 1
	dictionary.functions["setplayertagskill"] = new scriptFunction("void");
	dictionary.functions["isplayertagskill"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getplayergrabbedref"] = new scriptFunction("ref");
	dictionary.functions["isplayergrabbedref"] = new scriptFunction("int"); //0, 1
	dictionary.functions["placeleveledactoratme"] = new scriptFunction("ref");
	dictionary.functions["unusedfunction"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["showlockpickmenu"] = new scriptFunction("void");
	dictionary.functions["slpm"] = alias(dictionary.functions["showlockpickmenu"]);
	dictionary.functions["getbroadcaststate"] = new scriptFunction("int"); //0, 1
	dictionary.functions["setbroadcaststate"] = new scriptFunction("void");
	dictionary.functions["startradioconversation"] = new scriptFunction("void");
	dictionary.functions["getdestructionstage"] = new scriptFunction("int"); //0+
	dictionary.functions["cleardestruction"] = new scriptFunction("void");
	dictionary.functions["castimmediateonself"] = new scriptFunction("void", "R", 0, [new scriptFunctionParam("ref", "Spell")], {docLink: "http://geck.bethsoft.com/index.php/CastImmediateOnSelf", name: "CastImmediateOnSelf", shortName: "CIOS", longName: "CastImmediateOnSelf"});
	dictionary.functions["cios"] = alias(dictionary.functions["castimmediateonself"]);
	dictionary.functions["getisalignment"] = new scriptFunction("int"); //0, 1
	dictionary.functions["resetquest"] = new scriptFunction("void");
	dictionary.functions["setquestdelay"] = new scriptFunction("void");
	dictionary.functions["forceactivequest"] = new scriptFunction("void");
	dictionary.functions["getthreatratio"] = new scriptFunction("unknown");
	dictionary.functions["matchfacegeometry"] = new scriptFunction("void");
	dictionary.functions["getisuseditemequiptype"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getplayername"] = new scriptFunction("void");
	dictionary.functions["fireweapon"] = new scriptFunction("void");
	dictionary.functions["showtutorialmenu"] = new scriptFunction("void");
	dictionary.functions["agerace"] = new scriptFunction("void");
	dictionary.functions["matchrace"] = new scriptFunction("void");
	dictionary.functions["setpcyoung"] = new scriptFunction("void");
	dictionary.functions["sexchange"] = new scriptFunction("void");
	dictionary.functions["showspecialbookmenu"] = new scriptFunction("void");
	dictionary.functions["ssbm"] = alias(dictionary.functions["showspecialbookmenu"]);
	dictionary.functions["getconcussed"] = new scriptFunction("unknown");
	dictionary.functions["setzonerespawns"] = new scriptFunction("void");
	dictionary.functions["setvatstarget"] = new scriptFunction("void");
	dictionary.functions["getmapmarkervisible"] = new scriptFunction("int"); //0, 1
	dictionary.functions["resetinventory"] = new scriptFunction("void");
	dictionary.functions["showspecialbookmenuparams"] = new scriptFunction("void");
	dictionary.functions["ssbmp"] = alias(dictionary.functions["showspecialbookmenuparams"]);
	dictionary.functions["getpermanentactorvalue"] = new scriptFunction("float", "R", 0, [new scriptFunctionParam("string", "StatName", false, dictionary.values.actorValues)], {docLink: "http://geck.bethsoft.com/index.php/GetPermanentActorValue", name: "GetPermanentActorValue", shortName: "GetPermAV", longName: "GetPermanentActorValue"});
	dictionary.functions["getpermav"] = alias(dictionary.functions["getpermanentactorvalue"]);
	dictionary.functions["getkillingblowlimb"] = new scriptFunction("int", "R", 0, [], {docLink: "http://geck.bethsoft.com/index.php/GetKillingBlowLimb", name: "GetKillingBlowLimb"}); //0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
	dictionary.functions["showbarbermenu"] = new scriptFunction("void");
	dictionary.functions["showplasticsurgeonmenu"] = new scriptFunction("void");
	dictionary.functions["triggerlodapocalypse"] = new scriptFunction("void");
	dictionary.functions["getweaponhealthperc"] = new scriptFunction("int"); //0-100, may be float
	dictionary.functions["setweaponhealthperc"] = new scriptFunction("void");
	dictionary.functions["modweaponhealthperc"] = new scriptFunction("void");
	dictionary.functions["getradiationlevel"] = new scriptFunction("int"); //0+
	dictionary.functions["showallmapmarkers"] = new scriptFunction("void");
	dictionary.functions["tmm"] = alias(dictionary.functions["showallmapmarkers"]);
	dictionary.functions["showchargenmenumodvalues"] = new scriptFunction("void");
	dictionary.functions["scgmod"] = alias(dictionary.functions["showchargenmenumodvalues"]);
	dictionary.functions["resetai"] = new scriptFunction("void");
	dictionary.functions["setrumble"] = new scriptFunction("void");
	dictionary.functions["setnoactivationsound"] = new scriptFunction("void");
	dictionary.functions["clearnoactivationsound"] = new scriptFunction("void");
	dictionary.functions["getlasthitcritical"] = new scriptFunction("int"); //0, 1
	dictionary.functions["playmusic"] = new scriptFunction("void");
	dictionary.functions["setlocationspecificloadscreensonly"] = new scriptFunction("void");
	dictionary.functions["resetpipboymanager"] = new scriptFunction("void");
	dictionary.functions["setpctoddler"] = new scriptFunction("void");
	dictionary.functions["iscombattarget"] = new scriptFunction("int"); //0, 1
	dictionary.functions["rewardkarma"] = new scriptFunction("void");
	dictionary.functions["triggerscreenblood"] = new scriptFunction("void");
	dictionary.functions["tsb"] = alias(dictionary.functions["triggerscreenblood"]);
	dictionary.functions["getvatsrightareafree"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getvatsleftareafree"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getvatsbackareafree"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getvatsfrontareafree"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getislockbroken"] = new scriptFunction("int"); //0, 1
	dictionary.functions["isps3"] = new scriptFunction("int", "B", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsPS3", name: "IsPS3"}, [new scriptFunctionNote(
		function(functionCall) {return true;},
		"\"IsPS3\" will always return 0",
		1)]); //0
	dictionary.functions["iswin32"] = new scriptFunction("int", "B", 0, [], {docLink: "http://geck.bethsoft.com/index.php/IsWin32", name: "IsWin32"}, [new scriptFunctionNote(
		function(functionCall) {return true;},
		"\"IsWin32\" will always return 1",
		1)]); //0
	dictionary.functions["getvatsrighttargetvisible"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getvatslefttargetvisible"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getvatsbacktargetvisible"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getvatsfronttargetvisible"] = new scriptFunction("int"); //0, 1
	dictionary.functions["attachashpile"] = new scriptFunction("void");
	dictionary.functions["setcriticalstage"] = new scriptFunction("void");
	dictionary.functions["isincriticalstage"] = new scriptFunction("int"); //0, 1
	dictionary.functions["removefromallfactions"] = new scriptFunction("void");
	dictionary.functions["getxpfornextlevel"] = new scriptFunction("void");
	dictionary.functions["showlockpickmenudebug"] = new scriptFunction("void");
	dictionary.functions["slpmb"] = alias(dictionary.functions["showlockpickmenudebug"]);
	dictionary.functions["forcesave"] = new scriptFunction("void");
	dictionary.functions["setspecialpoints"] = new scriptFunction("void");
	dictionary.functions["addspecialpoints"] = new scriptFunction("void");
	dictionary.functions["settagskills"] = new scriptFunction("void");
	dictionary.functions["addtagskills"] = new scriptFunction("void");
	dictionary.functions["sin"] = new scriptFunction("float", "B", 0, [new scriptFunctionParam("float", "x"), new scriptFunctionParam("int", "arcsine flag", true)], {docLink: "http://geck.bethsoft.com/index.php/Sin", name: "sin"}); //0-1
	dictionary.functions["cos"] = new scriptFunction("float", "B", 0, [new scriptFunctionParam("float", "x"), new scriptFunctionParam("int", "arccosine flag", true)], {docLink: "http://geck.bethsoft.com/index.php/Cos", name: "cos"}); //0-1
	dictionary.functions["tan"] = new scriptFunction("float", "B", 0, [new scriptFunctionParam("float", "x"), new scriptFunctionParam("int", "arctangent flag", true)], {docLink: "http://geck.bethsoft.com/index.php/Tan", name: "tan"});
	dictionary.functions["sqrt"] = new scriptFunction("float", "B", 0, [new scriptFunctionParam("float", "x")], {docLink: "http://geck.bethsoft.com/index.php/Sqrt", name: "sqrt"}); //0+
	dictionary.functions["log"] = new scriptFunction("float", "B", 0, [new scriptFunctionParam("float", "x"), new scriptFunctionParam("float", "base", true)], {docLink: "http://geck.bethsoft.com/index.php/Log", name: "log"});
	dictionary.functions["abs"] = new scriptFunction("float", "B", 0, [new scriptFunctionParam("float", "x")], {docLink: "http://geck.bethsoft.com/index.php/Abs", name: "abs"}); //0+
	dictionary.functions["getquestcompleted"] = new scriptFunction("int"); //0, 1
	dictionary.functions["getqc"] = alias(dictionary.functions["getquestcompleted"]); //0, 1
	dictionary.functions["forceterminalback"] = new scriptFunction("void");
	dictionary.functions["pipboyradiooff"] = new scriptFunction("void");
	dictionary.functions["autodisplayobjectives"] = new scriptFunction("void");
	dictionary.functions["isgoredisabled"] = new scriptFunction("int"); //0, 1
	dictionary.functions["fadesfx"] = new scriptFunction("void");
	dictionary.functions["fsfx"] = alias(dictionary.functions["fadesfx"]);
	dictionary.functions["setminimaluse"] = new scriptFunction("void");
	dictionary.functions["setpccanusepowerarmor"] = new scriptFunction("void");
	dictionary.functions["showqueststages"] = new scriptFunction("void");
	dictionary.functions["sqs"] = alias(dictionary.functions["showqueststages"]);
	dictionary.functions["getspellusagenum"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["forceradiostationupdate"] = new scriptFunction("void");
	dictionary.functions["frsu"] = alias(dictionary.functions["forceradiostationupdate"]);
	dictionary.functions["getactorsinhigh"] = new scriptFunction("void", "D", 0, []);
	dictionary.functions["hasloaded3d"] = new scriptFunction("int"); //0, 1
	dictionary.functions["disableallmines"] = new scriptFunction("void");
	dictionary.functions["setlastextdooractivated"] = new scriptFunction("void");
	dictionary.functions["killquestupdates"] = new scriptFunction("void");
	dictionary.functions["kqu"] = alias(dictionary.functions["killquestupdates"]);
	dictionary.functions["isimagespaceactive"] = new scriptFunction("int"); //0, 1
	dictionary.functions["remapwatertype"] = new scriptFunction("void");
	dictionary.functions["additemtoleveledlist"] = new scriptFunction("void");
	dictionary.functions["addcreaturetoleveledlist"] = new scriptFunction("void");
	dictionary.functions["addnpctoleveledlist"] = new scriptFunction("void");
	dictionary.functions["addformtoformlist"] = new scriptFunction("void");
}

//FOSE Functions
{
	//FOSE v1
	dictionary.functions["addspellns"] = new scriptFunction("void", "R", 1.00, [new scriptFunctionParam("ref", "spell")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#AddSpellNS", name: "AddSpellNS"});
	dictionary.functions["ceil"] = new scriptFunction("float", "B", 1.00, [new scriptFunctionParam("float", "float")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#Ceil", name: "Ceil"});
	dictionary.functions["comparenames"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "inv item"), new scriptFunctionParam("ref", "target item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#CompareNames", name: "CompareNames"});
	dictionary.functions["con_closeallmenus"] = new scriptFunction("void", "B", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#con_CloseAllMenus", name: "con_CloseAllMenus"});
	dictionary.functions["con_getinisetting"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("string", "settingName")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#con_GetINISetting", name: "con_GetINISetting"});
	dictionary.functions["con_loadgame"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("string", "filename"), new scriptFunctionParam("int", "Integer", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#con_LoadGame", name: "con_LoadGame"});
	dictionary.functions["con_quitgame"] = new scriptFunction("void", "B", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#con_QuitGame", name: "con_QuitGame"});
	dictionary.functions["con_refreshini"] = new scriptFunction("void", "B", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#con_RefreshINI", name: "con_RefreshINI"});
	dictionary.functions["con_save"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("string", "saveName"), new scriptFunctionParam("int", "Integer", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#con_Save", name: "con_Save"});
	dictionary.functions["con_saveini"] = new scriptFunction("void", "B", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#con_SaveINI", name: "con_SaveINI"});
	dictionary.functions["con_setcamerafov"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("float", "Float", true), new scriptFunctionParam("float", "Float", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#con_SetCameraFOV", name: "con_SetCameraFOV"});
	dictionary.functions["con_setgamesetting"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("string", "settingName"), new scriptFunctionParam("string", "newValue")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#con_SetGameSetting", name: "con_SetGameSetting"});
	dictionary.functions["con_setinisetting"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("string", "setting"), new scriptFunctionParam("string", "newValue")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#con_SetINISetting", name: "con_SetINISetting"});
	dictionary.functions["con_setvel"] = new scriptFunction("void", "R", 1.00, [new scriptFunctionParam("string", "Axis", false, dictionary.values.axes), new scriptFunctionParam("float", "Float")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#con_SetVel", name: "con_SetVel"});
	dictionary.functions["debugprint"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("string", "format string"), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#DebugPrint", name: "DebugPrint", shortName: "dbprintc", longName: "DebugPrint"});
	dictionary.functions["dbprintc"] = alias(dictionary.functions["debugprint"]);
	dictionary.functions["disablecontrol"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("int", "controlCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#DisableControl", name: "DisableControl", shortName: "dc", longName: "DisableControl"});
	dictionary.functions["dc"] = alias(dictionary.functions["disablecontrol"]);
	dictionary.functions["disablekey"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("int", "scanCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#DisableKey", name: "DisableKey", shortName: "dk", longName: "DisableKey"});
	dictionary.functions["dk"] = alias(dictionary.functions["disablekey"]);
	dictionary.functions["enablecontrol"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("int", "controlCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#EnableControl", name: "EnableControl", shortName: "ec", longName: "EnableControl"});
	dictionary.functions["ec"] = alias(dictionary.functions["enablecontrol"]);
	dictionary.functions["enablekey"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("int", "scanCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#EnableKey", name: "EnableKey", shortName: "ek", longName: "EnableKey"});
	dictionary.functions["ek"] = alias(dictionary.functions["enablekey"]);
	dictionary.functions["exp"] = new scriptFunction("float", "B", 1.00, [new scriptFunctionParam("float", "float")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#Exp", name: "Exp"});
	dictionary.functions["floor"] = new scriptFunction("float", "B", 1.00, [new scriptFunctionParam("float", "float")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#Floor", name: "Floor", shortName: "flr", longName: "Floor"});
	dictionary.functions["flr"] = alias(dictionary.functions["floor"]);
	dictionary.functions["fmod"] = new scriptFunction("float", "B", 1.00, [new scriptFunctionParam("float", "x"), new scriptFunctionParam("float", "n"), new scriptFunctionParam("float", "offset", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#fmod", name: "fmod"});
	dictionary.functions["getaltcontrol"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("int", "controlCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetAltControl", name: "GetAltControl"});
	dictionary.functions["getarmorarmorrating"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetArmorAR", name: "GetArmorAR", shortName: "GetArmorAR", longName: "GetArmorArmorRating"});
	dictionary.functions["getarmorar"] = alias(dictionary.functions["getarmorarmorrating"]);
	dictionary.functions["getattackdamage"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetAttackDamage", name: "GetAttackDamage", shortName: "GetDamage", longName: "GetAttackDamage"});
	dictionary.functions["getdamage"] = alias(dictionary.functions["getattackdamage"]);
	dictionary.functions["getbaseobject"] = new scriptFunction("ref", "R", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetBaseObject", name: "GetBaseObject", shortName: "gbo", longName: "GetBaseObject"});
	dictionary.functions["gbo"] = alias(dictionary.functions["getbaseobject"]);
	dictionary.functions["getcontrol"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("int", "controlCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetControl", name: "GetControl"});
	dictionary.functions["getcrosshairref"] = new scriptFunction("ref", "B", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetCrosshairRef", name: "GetCrosshairRef"});
	dictionary.functions["getdebugmode"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("int", "modIndex", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetDebugMode", name: "GetDebugMode", shortName: "GetDBMode", longName: "GetDebugMode"});
	dictionary.functions["getdbmode"] = alias(dictionary.functions["getdebugmode"]);
	dictionary.functions["getequippedcurrenthealth"] = new scriptFunction("float", "R", 1.00, [new scriptFunctionParam("int", "equipmentSlot")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetEquippedCurrentHealth", name: "GetEquippedCurrentHealth", shortName: "GetEqCurHealth", longName: "GetEquippedCurrentHealth"});
	dictionary.functions["geteqcurhealth"] = alias(dictionary.functions["getequippedcurrenthealth"]);
	dictionary.functions["getequippedobject"] = new scriptFunction("ref", "R", 1.00, [new scriptFunctionParam("int", "atIndex")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetEquippedObject", name: "GetEquippedObject", shortName: "GetEqObj", longName: "GetEquippedObject"});
	dictionary.functions["geteqobj"] = alias(dictionary.functions["getequippedobject"]);
	dictionary.functions["getequiptype"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetEquipType", name: "GetEquipType"});
	dictionary.functions["getfirstref"] = new scriptFunction("ref", "B", 1.00, [new scriptFunctionParam("int", "form type", true), new scriptFunctionParam("int", "cell depth", true), new scriptFunctionParam("int", "include taken refs", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetFirstRef", name: "GetFirstRef"});
	dictionary.functions["getfirstrefincell"] = new scriptFunction("ref", "B", 1.00, [new scriptFunctionParam("ref", "cell"), new scriptFunctionParam("int", "form type", true), new scriptFunctionParam("int", "cell depth", true), new scriptFunctionParam("int", "include taken refs", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetFirstRefInCell", name: "GetFirstRefInCell"});
	dictionary.functions["getfosebeta"] = new scriptFunction("int", "B", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetFOSEBeta", name: "GetFOSEBeta"});
	dictionary.functions["getfoserevision"] = new scriptFunction("int", "B", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetFOSERevision", name: "GetFOSERevision"});
	dictionary.functions["getfoseversion"] = new scriptFunction("int", "B", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetFOSEVersion", name: "GetFOSEVersion"});
	dictionary.functions["getgameloaded"] = new scriptFunction("int", "B", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetGameLoaded", name: "GetGameLoaded"});
	dictionary.functions["getgamerestarted"] = new scriptFunction("int", "B", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetGameRestarted", name: "GetGameRestarted"});
	dictionary.functions["getbasehealth"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetHealth", name: "GetBaseHealth", shortName: "GetHealth", longName: "GetBaseHealth"});
	dictionary.functions["gethealth"] = alias(dictionary.functions["getbasehealth"]);
	dictionary.functions["gethotkeyitem"] = new scriptFunction("ref", "B", 1.00, [new scriptFunctionParam("int", "hotkey")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetHotkeyItem", name: "GetHotkeyItem"});
	dictionary.functions["getkeypress"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("int", "index")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetKeyPress", name: "GetKeyPress", shortName: "gkp", longName: "GetKeyPress"});
	dictionary.functions["gkp"] = alias(dictionary.functions["getkeypress"]);
	dictionary.functions["getlinkeddoor"] = new scriptFunction("ref", "R", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetLinkedDoor", name: "GetLinkedDoor"});
	dictionary.functions["getmodindex"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("string", "modName")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetModIndex", name: "GetModIndex"});
	dictionary.functions["getmousebuttonpress"] = new scriptFunction("FixMe", "B", 1.00, [new scriptFunctionParam("int", "index")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetMouseButtonPress", name: "GetMouseButtonPress", shortName: "gmbp", longName: "GetMouseButtonPress"});
	dictionary.functions["gmbp"] = alias(dictionary.functions["getmousebuttonpress"]);
	dictionary.functions["getnextref"] = new scriptFunction("ref", "B", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetNextRef", name: "GetNextRef"});
	dictionary.functions["getnumericgamesetting"] = new scriptFunction("IntegerOrFloat", "B", 1.00, [new scriptFunctionParam("string", "settingName")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetNumericGameSetting", name: "GetNumericGameSetting"});
	dictionary.functions["getnumericinisetting"] = new scriptFunction("IntegerOrFloat", "B", 1.00, [new scriptFunctionParam("string", "settingName")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetNumericINISetting", name: "GetNumericINISetting"});
	dictionary.functions["getnumkeyspressed"] = new scriptFunction("int", "B", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetNumKeysPressed", name: "GetNumKeysPressed", shortName: "gnkp", longName: "GetNumKeysPressed"});
	dictionary.functions["gnkp"] = alias(dictionary.functions["getnumkeyspressed"]);
	dictionary.functions["getnumloadedmods"] = new scriptFunction("int", "B", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetNumLoadedMods", name: "GetNumLoadedMods"});
	dictionary.functions["getnummousebuttonspressed"] = new scriptFunction("int", "B", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetNumMouseButtonsPressed", name: "GetNumMouseButtonsPressed", shortName: "gnmbp", longName: "GetNumMouseButtonsPressed"});
	dictionary.functions["gnmbp"] = alias(dictionary.functions["getnummousebuttonspressed"]);
	dictionary.functions["getnumrefs"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("int", "form type", true), new scriptFunctionParam("int", "cell depth", true), new scriptFunctionParam("int", "include taken refs", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetNumRefs", name: "GetNumRefs"});
	dictionary.functions["getnumrefsincell"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("ref", "cell"), new scriptFunctionParam("int", "form type", true), new scriptFunctionParam("int", "cell depth", true), new scriptFunctionParam("int", "include taken refs", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetNumRefsInCell", name: "GetNumRefsInCell"});
	dictionary.functions["getobjecteffect"] = new scriptFunction("ref", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetObjectEffect", name: "GetObjectEffect", shortName: "GetEnchantment", longName: "GetObjectEffect"});
	dictionary.functions["getenchantment"] = alias(dictionary.functions["getobjecteffect"]);
	dictionary.functions["getopenkey"] = new scriptFunction("ref", "R", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetOpenKey", name: "GetOpenKey", shortName: "GetKey", longName: "GetOpenKey"});
	dictionary.functions["getkey"] = alias(dictionary.functions["getopenkey"]);
	dictionary.functions["getparentcell"] = new scriptFunction("ref", "R", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetParentCell", name: "GetParentCell", shortName: "gpc", longName: "GetParentCell"});
	dictionary.functions["gpc"] = alias(dictionary.functions["getparentcell"]);
	dictionary.functions["getparentworldspace"] = new scriptFunction("ref", "R", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetParentWorldspace", name: "GetParentWorldspace", shortName: "gpw", longName: "GetParentWorldspace"});
	dictionary.functions["gpw"] = alias(dictionary.functions["getparentworldspace"]);
	dictionary.functions["getrepairlist"] = new scriptFunction("ref", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetRepairList", name: "GetRepairList", shortName: "grl", longName: "GetRepairList"});
	dictionary.functions["grl"] = alias(dictionary.functions["getrepairlist"]);
	dictionary.functions["getscript"] = new scriptFunction("ref", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetScript", name: "GetScript"});
	dictionary.functions["getsourcemodindex"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetSourceModIndex", name: "GetSourceModIndex"});
	dictionary.functions["getteleportcell"] = new scriptFunction("ref", "R", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetTeleportCell", name: "GetTeleportCell"});
	dictionary.functions["getobjecttype"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetType", name: "GetObjectType", shortName: "GetType", longName: "GetObjectType"});
	dictionary.functions["gettype"] = alias(dictionary.functions["getobjecttype"]);
	dictionary.functions["getuifloat"] = new scriptFunction("float", "B", 1.00, [new scriptFunctionParam("string", "traitName")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetUIFloat", name: "GetUIFloat"});
	dictionary.functions["getitemvalue"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetValue", name: "GetItemValue", shortName: "GetValue", longName: "GetItemValue"});
	dictionary.functions["getvalue"] = alias(dictionary.functions["getitemvalue"]);
	dictionary.functions["getweaponactionpoints"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponActionPoints", name: "GetWeaponActionPoints", shortName: "GetAP", longName: "GetWeaponActionPoints"});
	dictionary.functions["getap"] = alias(dictionary.functions["getweaponactionpoints"]);
	dictionary.functions["getweaponaimarc"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponAimArm", name: "GetWeaponAimArm", shortName: "GetAimArc", longName: "GetWeaponAimArm"});
	dictionary.functions["getaimarc"] = alias(dictionary.functions["getweaponaimarc"]);
	dictionary.functions["getweaponammo"] = new scriptFunction("ref", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponAmmo", name: "GetWeaponAmmo", shortName: "GetAmmo", longName: "GetWeaponAmmo"});
	dictionary.functions["getammo"] = alias(dictionary.functions["getweaponammo"]);
	dictionary.functions["getweaponammouse"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponAmmoUse", name: "GetWeaponAmmoUse", shortName: "GetAmmoUse", longName: "GetWeaponAmmoUse"});
	dictionary.functions["getammouse"] = alias(dictionary.functions["getweaponammouse"]);
	dictionary.functions["getweaponanimattackmult"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponAnimAttackMult", name: "GetWeaponAnimAttackMult", shortName: "GetAnimAttackMult", longName: "GetWeaponAnimAttackMult"});
	dictionary.functions["getanimattackmult"] = alias(dictionary.functions["getweaponanimattackmult"]);
	dictionary.functions["getweaponanimjamtime"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponAnimJamTime", name: "GetWeaponAnimJamTime", shortName: "GetAnimJamTime", longName: "GetWeaponAnimJamTime"});
	dictionary.functions["getanimjamtime"] = alias(dictionary.functions["getweaponanimjamtime"]);
	dictionary.functions["getweaponanimmult"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponAnimMult", name: "GetWeaponAnimMult", shortName: "GetAnimMult", longName: "GetWeaponAnimMult"});
	dictionary.functions["getanimmult"] = alias(dictionary.functions["getweaponanimmult"]);
	dictionary.functions["getweaponanimreloadtime"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponAnimReloadTime", name: "GetWeaponAnimReloadTime", shortName: "GetAnimReloadTime", longName: "GetWeaponAnimReloadTime"});
	dictionary.functions["getanimreloadtime"] = alias(dictionary.functions["getweaponanimreloadtime"]);
	dictionary.functions["getweaponanimshotspersec"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponAnimShotsPerSec", name: "GetWeaponAnimShotsPerSec", shortName: "GetAnimShotsPerSec", longName: "GetWeaponAnimShotsPerSec"});
	dictionary.functions["getanimshotspersec"] = alias(dictionary.functions["getweaponanimshotspersec"]);
	dictionary.functions["getweaponattackanimation"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponAttackAnimation", name: "GetWeaponAttackAnimation", shortName: "GetAttackAnim", longName: "GetWeaponAttackAnimation"});
	dictionary.functions["getattackanim"] = alias(dictionary.functions["getweaponattackanimation"]);
	dictionary.functions["getweaponbasevatschance"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponBaseVATSChance", name: "GetWeaponBaseVATSChance", shortName: "GetVATSChance", longName: "GetWeaponBaseVATSChance"});
	dictionary.functions["getvatschance"] = alias(dictionary.functions["getweaponbasevatschance"]);
	dictionary.functions["getweaponcliprounds"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponClipRounds", name: "GetWeaponClipRounds", shortName: "GetClipSize", longName: "GetWeaponClipRounds"});
	dictionary.functions["getclipsize"] = alias(dictionary.functions["getweaponcliprounds"]);
	dictionary.functions["getweaponcritchance"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponCritChance", name: "GetWeaponCritChance", shortName: "GetCritPerc", longName: "GetWeaponCritChance"});
	dictionary.functions["getcritperc"] = alias(dictionary.functions["getweaponcritchance"]);
	dictionary.functions["getweaponcritdamage"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponCritDamage", name: "GetWeaponCritDamage", shortName: "GetCritDam", longName: "GetWeaponCritDamage"});
	dictionary.functions["getcritdam"] = alias(dictionary.functions["getweaponcritdamage"]);
	dictionary.functions["getweaponcriteffect"] = new scriptFunction("ref", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponCritEffect", name: "GetWeaponCritEffect", shortName: "GetCritEffect", longName: "GetWeaponCritEffect"});
	dictionary.functions["getcriteffect"] = alias(dictionary.functions["getweaponcriteffect"]);
	dictionary.functions["getweaponfiredelaymax"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponFireDelayMax", name: "GetWeaponFireDelayMax", shortName: "GetFireDelayMax", longName: "GetWeaponFireDelayMax"});
	dictionary.functions["getfiredelaymax"] = alias(dictionary.functions["getweaponfiredelaymax"]);
	dictionary.functions["getweaponfiredelaymin"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponFireDelayMin", name: "GetWeaponFireDelayMin", shortName: "GetFireDelayMin", longName: "GetWeaponFireDelayMin"});
	dictionary.functions["getfiredelaymin"] = alias(dictionary.functions["getweaponfiredelaymin"]);
	dictionary.functions["getweaponfirerate"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponFireRate", name: "GetWeaponFireRate", shortName: "GetFireRate", longName: "GetWeaponFireRate"});
	dictionary.functions["getfirerate"] = alias(dictionary.functions["getweaponfirerate"]);
	dictionary.functions["getweaponhandgrip"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponHandGrip", name: "GetWeaponHandGrip", shortName: "GetHandGrip", longName: "GetWeaponHandGrip"});
	dictionary.functions["gethandgrip"] = alias(dictionary.functions["getweaponhandgrip"]);
	dictionary.functions["getweaponhasscope"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponHasScope", name: "GetWeaponHasScope"});
	dictionary.functions["getweaponisautomatic"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponIsAutomatic", name: "GetWeaponIsAutomatic", shortName: "GetIsAutomatic", longName: "GetWeaponIsAutomatic"});
	dictionary.functions["getisautomatic"] = alias(dictionary.functions["getweaponisautomatic"]);
	dictionary.functions["getweaponlimbdamagemult"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponLimbDamageMult", name: "GetWeaponLimbDamageMult", shortName: "GetLimbDamageMult", longName: "GetWeaponLimbDamageMult"});
	dictionary.functions["getlimbdamagemult"] = alias(dictionary.functions["getweaponlimbdamagemult"]);
	dictionary.functions["getweaponmaxrange"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponMaxRange", name: "GetWeaponMaxRange", shortName: "GetMaxRange", longName: "GetWeaponMaxRange"});
	dictionary.functions["getmaxrange"] = alias(dictionary.functions["getweaponmaxrange"]);
	dictionary.functions["getweaponminrange"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponMinRange", name: "GetWeaponMinRange", shortName: "GetMinRange", longName: "GetWeaponMinRange"});
	dictionary.functions["getminrange"] = alias(dictionary.functions["getweaponminrange"]);
	dictionary.functions["getweaponminspread"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponMinSpread", name: "GetWeaponMinSpread", shortName: "GetMinSpread", longName: "GetWeaponMinSpread"});
	dictionary.functions["getminspread"] = alias(dictionary.functions["getweaponminspread"]);
	dictionary.functions["getweaponnumprojectiles"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponNumProjectiles", name: "GetWeaponNumProjectiles", shortName: "GetNumProj", longName: "GetWeaponNumProjectiles"});
	dictionary.functions["getnumproj"] = alias(dictionary.functions["getweaponnumprojectiles"]);
	dictionary.functions["getweaponprojectile"] = new scriptFunction("ref", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponProjectile", name: "GetWeaponProjectile", shortName: "GetWeapProj", longName: "GetWeaponProjectile"});
	dictionary.functions["getweapproj"] = alias(dictionary.functions["getweaponprojectile"]);
	dictionary.functions["getweaponreach"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponReach", name: "GetWeaponReach", shortName: "GetReach", longName: "GetWeaponReach"});
	dictionary.functions["getreach"] = alias(dictionary.functions["getweaponreach"]);
	dictionary.functions["getweaponreloadanim"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponReloadAnim", name: "GetWeaponReloadAnim", shortName: "GetReloadAnim", longName: "GetWeaponReloadAnim"});
	dictionary.functions["getreloadanim"] = alias(dictionary.functions["getweaponreloadanim"]);
	dictionary.functions["getweaponresisttype"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponResistType", name: "GetWeaponResistType", shortName: "GetWeaponResist", longName: "GetWeaponResistType"});
	dictionary.functions["getweaponresist"] = alias(dictionary.functions["getweaponresisttype"]);
	dictionary.functions["getweaponrumbleduration"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponRumbleDuration", name: "GetWeaponRumbleDuration", shortName: "GetRumbleDuration", longName: "GetWeaponRumbleDuration"});
	dictionary.functions["getrumbleduration"] = alias(dictionary.functions["getweaponrumbleduration"]);
	dictionary.functions["getweaponrumbleleftmotor"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponRumbleLeftMotor", name: "GetWeaponRumbleLeftMotor", shortName: "GetRumbleLeft", longName: "GetWeaponRumbleLeftMotor"});
	dictionary.functions["getrumbleleft"] = alias(dictionary.functions["getweaponrumbleleftmotor"]);
	dictionary.functions["getweaponrumblerightmotor"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponRumbleRightMotor", name: "GetWeaponRumbleRightMotor", shortName: "GetRumbleRight", longName: "GetWeaponRumbleRightMotor"});
	dictionary.functions["getrumbleright"] = alias(dictionary.functions["getweaponrumblerightmotor"]);
	dictionary.functions["getweaponrumblewavelength"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponRumbleWaveLength", name: "GetWeaponRumbleWaveLength", shortName: "GetRumbleWaveLen", longName: "GetWeaponRumbleWaveLength"});
	dictionary.functions["getrumblewavelen"] = alias(dictionary.functions["getweaponrumblewavelength"]);
	dictionary.functions["getweaponsightfov"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponSightFOV", name: "GetWeaponSightFOV", shortName: "GetSightFOV", longName: "GetWeaponSightFOV"});
	dictionary.functions["getsightfov"] = alias(dictionary.functions["getweaponsightfov"]);
	dictionary.functions["getweaponsightusage"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponSightUsage", name: "GetWeaponSightUsage", shortName: "GetSightUsage", longName: "GetWeaponSightUsage"});
	dictionary.functions["getsightusage"] = alias(dictionary.functions["getweaponsightusage"]);
	dictionary.functions["getweaponskill"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponSkill", name: "GetWeaponSkill"});
	dictionary.functions["getweaponspread"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponSpread", name: "GetWeaponSpread", shortName: "GetSpread", longName: "GetWeaponSpread"});
	dictionary.functions["getspread"] = alias(dictionary.functions["getweaponspread"]);
	dictionary.functions["getweapontype"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeaponType", name: "GetWeaponType", shortName: "GetWeapType", longName: "GetWeaponType"});
	dictionary.functions["getweaptype"] = alias(dictionary.functions["getweapontype"]);
	dictionary.functions["getweight"] = new scriptFunction("float", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#GetWeight", name: "GetWeight"});
	dictionary.functions["goto"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("int", "labelID")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#Goto", name: "Goto"});
	dictionary.functions["holdkey"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("int", "scanCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#HoldKey", name: "HoldKey", shortName: "hk", longName: "HoldKey"});
	dictionary.functions["hk"] = alias(dictionary.functions["holdkey"]);
	dictionary.functions["isclonedform"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#IsClonedForm", name: "IsClonedForm", shortName: "IsCloned", longName: "IsClonedForm"});
	dictionary.functions["iscloned"] = alias(dictionary.functions["isclonedform"]);
	dictionary.functions["iscontrol"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("int", "scanCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#IsControl", name: "IsControl"});
	dictionary.functions["iscontroldisabled"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("int", "controlCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#IsControlDisabled", name: "IsControlDisabled"});
	dictionary.functions["iscontrolpressed"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("int", "controlCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#IsControlPressed", name: "IsControlPressed"});
	dictionary.functions["isformvalid"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "refVar", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#IsFormValid", name: "IsFormValid"});
	dictionary.functions["iskeydisabled"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("int", "scanCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#IsKeyDisabled", name: "IsKeyDisabled"});
	dictionary.functions["iskeypressed"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("int", "scanCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#IsKeyPressed", name: "IsKeyPressed"});
	dictionary.functions["ismodloaded"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("string", "modName")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#IsModLoaded", name: "IsModLoaded"});
	dictionary.functions["ispowerarmor"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#IsPowerArmor", name: "IsPowerArmor", shortName: "IsPA", longName: "IsPowerArmor"});
	dictionary.functions["ispa"] = alias(dictionary.functions["ispowerarmor"]);
	dictionary.functions["isreference"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("ref", "reference")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#IsReference", name: "IsReference"});
	dictionary.functions["isscripted"] = new scriptFunction("int", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#IsScripted", name: "IsScripted"});
	dictionary.functions["label"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("int", "labelID")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#Label", name: "Label"});
	dictionary.functions["leftshift"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("int", "int"), new scriptFunctionParam("int", "int")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#LeftShift", name: "LeftShift"});
	dictionary.functions["listaddform"] = new scriptFunction("ref", "B", 1.00, [new scriptFunctionParam("ref", "form list"), new scriptFunctionParam("ref", "form"), new scriptFunctionParam("int", "index", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#ListAddForm", name: "ListAddForm"});
	dictionary.functions["listaddreference"] = new scriptFunction("int", "R", 1.00, [new scriptFunctionParam("ref", "form list"), new scriptFunctionParam("int", "index", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#ListAddReference", name: "ListAddReference", shortName: "ListAddRef", longName: "ListAddReference"});
	dictionary.functions["listaddref"] = alias(dictionary.functions["listaddreference"]);
	dictionary.functions["listgetcount"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("ref", "form list")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#ListGetCount", name: "ListGetCount"});
	dictionary.functions["listgetformindex"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("ref", "form list"), new scriptFunctionParam("ref", "form")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#ListGetFormIndex", name: "ListGetFormIndex"});
	dictionary.functions["listgetnthform"] = new scriptFunction("ref", "B", 1.00, [new scriptFunctionParam("ref", "form list"), new scriptFunctionParam("int", "index")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#ListGetNthForm", name: "ListGetNthForm"});
	dictionary.functions["listremoveform"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("ref", "form list"), new scriptFunctionParam("ref", "form")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#ListRemoveForm", name: "ListRemoveForm"});
	dictionary.functions["listremoventhform"] = new scriptFunction("ref", "B", 1.00, [new scriptFunctionParam("ref", "form list"), new scriptFunctionParam("int", "index", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#ListRemoveNthForm", name: "ListRemoveNthForm", shortName: "ListRemoveNth", longName: "ListRemoveNthForm"});
	dictionary.functions["listremoventh"] = alias(dictionary.functions["listremoventhform"]);
	dictionary.functions["listreplaceform"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("ref", "form list"), new scriptFunctionParam("ref", "replaceWith"), new scriptFunctionParam("ref", "formToReplace")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#ListReplaceForm", name: "ListReplaceForm"});
	dictionary.functions["listreplacenthform"] = new scriptFunction("ref", "B", 1.00, [new scriptFunctionParam("ref", "form list"), new scriptFunctionParam("ref", "replaceWith"), new scriptFunctionParam("int", "formIndex", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#ListReplaceNthForm", name: "ListReplaceNthForm", shortName: "ListReplaceNth", longName: "ListReplaceNthForm"});
	dictionary.functions["listreplacenth"] = alias(dictionary.functions["listreplacenthform"]);
	dictionary.functions["log10"] = new scriptFunction("float", "B", 1.00, [new scriptFunctionParam("float", "float")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#Log10", name: "Log10"});
	dictionary.functions["logicaland"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("int", "int"), new scriptFunctionParam("int", "int")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#LogicalAnd", name: "LogicalAnd"});
	dictionary.functions["logicalnot"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("int", "int")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#LogicalNot", name: "LogicalNot"});
	dictionary.functions["logicalor"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("int", "int"), new scriptFunctionParam("int", "int")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#LogicalOr", name: "LogicalOr"});
	dictionary.functions["logicalxor"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("int", "int"), new scriptFunctionParam("int", "int")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#LogicalXor", name: "LogicalXor"});
	dictionary.functions["menuholdkey"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("int", "scanCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#MenuHoldKey", name: "MenuHoldKey", shortName: "mhk", longName: "MenuHoldKey"});
	dictionary.functions["mhk"] = alias(dictionary.functions["menuholdkey"]);
	dictionary.functions["menureleasekey"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("int", "scanCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#MenuReleaseKey", name: "MenuReleaseKey", shortName: "mrk", longName: "MenuReleaseKey"});
	dictionary.functions["mrk"] = alias(dictionary.functions["menureleasekey"]);
	dictionary.functions["menutapkey"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("int", "scanCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#MenuTapKey", name: "MenuTapKey", shortName: "mtk", longName: "MenuTapKey"});
	dictionary.functions["mtk"] = alias(dictionary.functions["menutapkey"]);
	dictionary.functions["printactivetile"] = new scriptFunction("void", "B", 1.00, [], {docLink: "http://fose.silverlock.org/fose_command_doc.html#PrintActiveTile", name: "PrintActiveTile"});
	dictionary.functions["printtoconsole"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("string", "format string"), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true), new scriptFunctionParam("float", "variable", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#PrintToConsole", name: "PrintToConsole", shortName: "printc", longName: "PrintToConsole"});
	dictionary.functions["printc"] = alias(dictionary.functions["printtoconsole"]);
	dictionary.functions["releasekey"] = new scriptFunction("FixMe", "B", 1.00, [new scriptFunctionParam("int", "scanCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#ReleaseKey", name: "ReleaseKey", shortName: "rk", longName: "ReleaseKey"});
	dictionary.functions["rk"] = alias(dictionary.functions["releasekey"]);
	dictionary.functions["removescript"] = new scriptFunction("ref", "E", 1.00, [new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#RemoveScript", name: "RemoveScript"});
	dictionary.functions["rightshift"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("int", "int"), new scriptFunctionParam("int", "int")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#RightShift", name: "RightShift"});
	dictionary.functions["setaltcontrol"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("int", "controlCode"), new scriptFunctionParam("int", "scanCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetAltControl", name: "SetAltControl"});
	dictionary.functions["setattackdamage"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("int", "damage"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetAttackDamage", name: "SetAttackDamage", shortName: "SetDamage", longName: "SetAttackDamage"});
	dictionary.functions["setdamage"] = alias(dictionary.functions["setattackdamage"]);
	dictionary.functions["setbaseitemvalue"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("ref", "form"), new scriptFunctionParam("int", "newValue")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetBaseItemValue", name: "SetBaseItemValue", shortName: "SetValue", longName: "SetBaseItemValue"});
	dictionary.functions["setvalue"] = alias(dictionary.functions["setbaseitemvalue"]);
	dictionary.functions["setcontrol"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("int", "controlCode"), new scriptFunctionParam("int", "scanCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetControl", name: "SetControl"});
	dictionary.functions["setdebugmode"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("int", "bEnableDebugMessages"), new scriptFunctionParam("int", "modIndex", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetDebugMode", name: "SetDebugMode", shortName: "DBMode", longName: "SetDebugMode"});
	dictionary.functions["dbmode"] = alias(dictionary.functions["setdebugmode"]);
	dictionary.functions["setequippedcurrenthealth"] = new scriptFunction("void", "R", 1.00, [new scriptFunctionParam("float", "val"), new scriptFunctionParam("int", "equipmentSlot")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetEquippedCurrentHealth", name: "SetEquippedCurrentHealth", shortName: "SetEqCurHealth", longName: "SetEquippedCurrentHealth"});
	dictionary.functions["seteqcurhealth"] = alias(dictionary.functions["setequippedcurrenthealth"]);
	dictionary.functions["setobjecthealth"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("int", "newHealth"), new scriptFunctionParam("ref", "form", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetHealth", name: "SetObjectHealth", shortName: "SetHealth", longName: "SetObjectHealth"});
	dictionary.functions["sethealth"] = alias(dictionary.functions["setobjecthealth"]);
	dictionary.functions["setiscontrol"] = new scriptFunction("int", "B", 1.00, [new scriptFunctionParam("int", "scanCode"), new scriptFunctionParam("int", "isControl")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetIsControl", name: "SetIsControl"});
	dictionary.functions["setispowerarmor"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("int", "path type"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetIsPowerArmor", name: "SetIsPowerArmor", shortName: "SetIsPA", longName: "SetIsPowerArmor"});
	dictionary.functions["setispa"] = alias(dictionary.functions["setispowerarmor"]);
	dictionary.functions["setname"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("string", "name"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetName", name: "SetName"});
	dictionary.functions["setnumericgamesetting"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("string", "settingName"), new scriptFunctionParam("float", "float")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetNumericGameSetting", name: "SetNumericGameSetting"});
	dictionary.functions["setnumericinisetting"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("string", "settingName"), new scriptFunctionParam("float", "newValue")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetNumericINISetting", name: "SetNumericINISetting"});
	dictionary.functions["setopenkey"] = new scriptFunction("void", "R", 1.00, [new scriptFunctionParam("ref", "item")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetOpenKey", name: "SetOpenKey", shortName: "SetKey", longName: "SetOpenKey"});
	dictionary.functions["setkey"] = alias(dictionary.functions["setopenkey"]);
	dictionary.functions["setrepairlist"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("ref", "form list"), new scriptFunctionParam("ref", "target item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetRepairList", name: "SetRepairList"});
	dictionary.functions["setscript"] = new scriptFunction("ref", "E", 1.00, [new scriptFunctionParam("ref", "scriptInRef"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetScript", name: "SetScript"});
	dictionary.functions["setuifloat"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("string", "traitName"), new scriptFunctionParam("float", "newValue")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetUIFloat", name: "SetUIFloat"});
	dictionary.functions["setuistring"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("string", "traitName"), new scriptFunctionParam("string", "newValue")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetUIString", name: "SetUIString"});
	dictionary.functions["setweaponactionpoints"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("float", "float"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponActionPoints", name: "SetWeaponActionPoints", shortName: "SetAP", longName: "SetWeaponActionPoints"});
	dictionary.functions["setap"] = alias(dictionary.functions["setweaponactionpoints"]);
	dictionary.functions["setweaponaimarc"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("float", "aimArc"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponAimArc", name: "SetWeaponAimArc", shortName: "SetAimArc", longName: "SetWeaponAimArc"});
	dictionary.functions["setaimarc"] = alias(dictionary.functions["setweaponaimarc"]);
	dictionary.functions["setweaponammo"] = new scriptFunction("ref", "E", 1.00, [new scriptFunctionParam("ref", "NewAmmoInRef"), new scriptFunctionParam("ref", "target item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponAmmo", name: "SetWeaponAmmo", shortName: "SetAmmo", longName: "SetWeaponAmmo"});
	dictionary.functions["setammo"] = alias(dictionary.functions["setweaponammo"]);
	dictionary.functions["setweaponammouse"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("int", "path type"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponAmmoUse", name: "SetWeaponAmmoUse", shortName: "SetAmmoUse", longName: "SetWeaponAmmoUse"});
	dictionary.functions["setammouse"] = alias(dictionary.functions["setweaponammouse"]);
	dictionary.functions["setweaponanimattackmult"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("float", "float"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponAnimAttackMult", name: "SetWeaponAnimAttackMult", shortName: "SetAnimAttackMult", longName: "SetWeaponAnimAttackMult"});
	dictionary.functions["setanimattackmult"] = alias(dictionary.functions["setweaponanimattackmult"]);
	dictionary.functions["setweaponanimmult"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("float", "float"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponAnimMult", name: "SetWeaponAnimMult", shortName: "SetAnimMult", longName: "SetWeaponAnimMult"});
	dictionary.functions["setanimmult"] = alias(dictionary.functions["setweaponanimmult"]);
	dictionary.functions["setweaponattackanimation"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("int", "attackAnimation"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponAttackAnimation", name: "SetWeaponAttackAnimation", shortName: "SetAttackAnim", longName: "SetWeaponAttackAnimation"});
	dictionary.functions["setattackanim"] = alias(dictionary.functions["setweaponattackanimation"]);
	dictionary.functions["setweaponbasevatschance"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("int", "newVATSChance"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponBaseVATSChance", name: "SetWeaponBaseVATSChance", shortName: "SetVATSChance", longName: "SetWeaponBaseVATSChance"});
	dictionary.functions["setvatschance"] = alias(dictionary.functions["setweaponbasevatschance"]);
	dictionary.functions["setweaponcliprounds"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("int", "path type"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponClipRounds", name: "SetWeaponClipRounds", shortName: "SetClipSize", longName: "SetWeaponClipRounds"});
	dictionary.functions["setclipsize"] = alias(dictionary.functions["setweaponcliprounds"]);
	dictionary.functions["setweaponcritchance"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("float", "float"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponCritChance", name: "SetWeaponCritChance", shortName: "SetCritPerc", longName: "SetWeaponCritChance"});
	dictionary.functions["setcritperc"] = alias(dictionary.functions["setweaponcritchance"]);
	dictionary.functions["setweaponcritdamage"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("int", "path type"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponCritDamage", name: "SetWeaponCritDamage"});
	dictionary.functions["setweaponcriteffect"] = new scriptFunction("ref", "E", 1.00, [new scriptFunctionParam("ref", "magic item"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponCritEffect", name: "SetWeaponCritEffect", shortName: "SetCritEffect", longName: "SetWeaponCritEffect"});
	dictionary.functions["setcriteffect"] = alias(dictionary.functions["setweaponcriteffect"]);
	dictionary.functions["setweaponhandgrip"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("int", "handGrip"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponHandGrip", name: "SetWeaponHandGrip", shortName: "SetHandGrip", longName: "SetWeaponHandGrip"});
	dictionary.functions["sethandgrip"] = alias(dictionary.functions["setweaponhandgrip"]);
	dictionary.functions["setweaponisautomatic"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("int", "isAutomatic"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponIsAutomatic", name: "SetWeaponIsAutomatic", shortName: "SetIsAutomatic", longName: "SetWeaponIsAutomatic"});
	dictionary.functions["setisautomatic"] = alias(dictionary.functions["setweaponisautomatic"]);
	dictionary.functions["setweaponlimbdamagemult"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("float", "limbDamageMult"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponLimbDamageMult", name: "SetWeaponLimbDamageMult", shortName: "SetLimbDamageMult", longName: "SetWeaponLimbDamageMult"});
	dictionary.functions["setlimbdamagemult"] = alias(dictionary.functions["setweaponlimbdamagemult"]);
	dictionary.functions["setweaponmaxrange"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("float", "float"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponMaxRange", name: "SetWeaponMaxRange", shortName: "SetMaxRange", longName: "SetWeaponMaxRange"});
	dictionary.functions["setmaxrange"] = alias(dictionary.functions["setweaponmaxrange"]);
	dictionary.functions["setweaponminrange"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("float", "float"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponMinRange", name: "SetWeaponMinRange", shortName: "SetMinRange", longName: "SetWeaponMinRange"});
	dictionary.functions["setminrange"] = alias(dictionary.functions["setweaponminrange"]);
	dictionary.functions["setweaponminspread"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("float", "float"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponMinSpread", name: "SetWeaponMinSpread", shortName: "SetMinSpread", longName: "SetWeaponMinSpread"});
	dictionary.functions["setminspread"] = alias(dictionary.functions["setweaponminspread"]);
	dictionary.functions["setweaponnumprojectiles"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("int", "numProjectiles"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponNumProjectiles", name: "SetWeaponNumProjectiles", shortName: "SetNumProj", longName: "SetWeaponNumProjectiles"});
	dictionary.functions["setnumproj"] = alias(dictionary.functions["setweaponnumprojectiles"]);
	dictionary.functions["setweaponprojectile"] = new scriptFunction("ref", "E", 1.00, [new scriptFunctionParam("ref", "NewProjectileInRef"), new scriptFunctionParam("ref", "target item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponProjectile", name: "SetWeaponProjectile", shortName: "SetProjectile", longName: "SetWeaponProjectile"});
	dictionary.functions["setprojectile"] = alias(dictionary.functions["setweaponprojectile"]);
	dictionary.functions["setweaponreach"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("float", "reach"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponReach", name: "SetWeaponReach", shortName: "SetReach", longName: "SetWeaponReach"});
	dictionary.functions["setreach"] = alias(dictionary.functions["setweaponreach"]);
	dictionary.functions["setweaponreloadanim"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("int", "reloadAnim"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponReloadAnim", name: "SetWeaponReloadAnim", shortName: "SetReloadAnim", longName: "SetWeaponReloadAnim"});
	dictionary.functions["setreloadanim"] = alias(dictionary.functions["setweaponreloadanim"]);
	dictionary.functions["setweaponsightfov"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("float", "float"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponSightFOV", name: "SetWeaponSightFOV", shortName: "SetSightFOV", longName: "SetWeaponSightFOV"});
	dictionary.functions["setsightfov"] = alias(dictionary.functions["setweaponsightfov"]);
	dictionary.functions["setweaponsightusage"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("float", "sightUsage"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponSightUsage", name: "SetWeaponSightUsage", shortName: "SetSightUsage", longName: "SetWeaponSightUsage"});
	dictionary.functions["setsightusage"] = alias(dictionary.functions["setweaponsightusage"]);
	dictionary.functions["setweaponspread"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("float", "float"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponSpread", name: "SetWeaponSpread", shortName: "SetSpread", longName: "SetWeaponSpread"});
	dictionary.functions["setspread"] = alias(dictionary.functions["setweaponspread"]);
	dictionary.functions["setweapontype"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("int", "weaponType"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeaponType", name: "SetWeaponType"});
	dictionary.functions["setweight"] = new scriptFunction("void", "E", 1.00, [new scriptFunctionParam("float", "float"), new scriptFunctionParam("ref", "item", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#SetWeight", name: "SetWeight"});
	dictionary.functions["tapcontrol"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("int", "controlCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#TapControl", name: "TapControl", shortName: "tc", longName: "TapControl"});
	dictionary.functions["tc"] = alias(dictionary.functions["tapcontrol"]);
	dictionary.functions["tapkey"] = new scriptFunction("void", "B", 1.00, [new scriptFunctionParam("int", "scanCode")], {docLink: "http://fose.silverlock.org/fose_command_doc.html#TapKey", name: "TapKey", shortName: "tk", longName: "TapKey"});
	dictionary.functions["tk"] = alias(dictionary.functions["tapkey"]);
	dictionary.functions["tempcloneform"] = new scriptFunction("ref", "E", 1.00, [new scriptFunctionParam("ref", "formToClone", true)], {docLink: "http://fose.silverlock.org/fose_command_doc.html#TempCloneForm", name: "TempCloneForm"});

	//FOSE 1.2 temp docs
	dictionary.functions["getcurrenthealth"] = new scriptFunction("float", "R", 1.2, []);
	dictionary.functions["setcurrenthealth"] = new scriptFunction("void", "E", 1.2, [new scriptFunctionParam("float", "health"), new scriptFunctionParam("ref", "form", true)]);
	dictionary.functions["rand"] = new scriptFunction("float", "B", 1.2, [new scriptFunctionParam("float", "min"), new scriptFunctionParam("float", "max")]);
	dictionary.functions["getnumitems"] = new scriptFunction("int", "R", 1.2, []);
	dictionary.functions["getinventoryobject"] = new scriptFunction("ref", "R", 1.2, [new scriptFunctionParam("int", "idx")]);
}