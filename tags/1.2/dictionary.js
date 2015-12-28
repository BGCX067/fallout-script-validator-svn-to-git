/*This file contains definitions of keywords and functions used in Fallout 3's scripting language.  These definitions are part of the Fallout 3 script validator available at http://www.cipscis.com/fallout/utilities/validator.aspx
Copyright (C) 2010 Mark Hanna, a.k.a. Cipscis

This code is free software: you can redistribute it and/or modify it under the terms of the GNU General Public LIcense as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This code is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

See http://www.gnu.org/licenses/ for a copy of the GNU General Public License
*/


function variable(varName, type) {
	this.varName = varName;

	this.type = type;
	//Accepted values:
	//'ref'		- FormID
	//'int'		- Integer
	//'float'	- Floating point value

	this.sets = 0;
	//Incremented whenever the variable is assigned a value

	this.checks = 0;
	//Incremented whenever the variable's value is checked
}

function editorID(type) { this.type = type; }

function blocktype(scriptType, names) {
	this.scriptType = scriptType;
	this.docLink = names.docLink == undefined ? '' : names.docLink;
	this.name = names.name == undefined ? '' : names.name
	//Binary flags
	//1 (0001) = Result
	//2 (0010) = Quest
	//4 (0100) = Object
	//8 (1000) = Effect
}

function scriptFunction(returnType, callingConvention, SEVersion, params, names, notes) {
	if (returnType != undefined)
		this.returnType = returnType;

	if (callingConvention in {'R': 1, 'S': 1, 'E': 1, 'B' : 1, 'D': 1})
		this.callingConvention = callingConvention;
	//Accepted values:
	//'R'		- Called on a reference
	//'S'		- Reference function that should always be called implicitly
	//'E'		- Called on reference or on base form specified as final parameter - script extender functions only
	//'B'		- Not called on a reference.  A base form may be specified as a parameter
	//'D'		- The function is deprecated and should not be called in any way

	if (SEVersion != undefined)
		this.SEVersion = SEVersion;
	//The required version of the relevant script extender
	//Use 0 for functions that don't require a script extender
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

function alias(functionDef) { return new scriptFunction(functionDef.returnType, functionDef.callingConvention, functionDef.SEVersion, functionDef.params, {docLink: functionDef.docLink, name: functionDef.shortName, shortName: functionDef.shortName, longName: functionDef.longName}, functionDef.notes); }

function scriptFunctionParam(dataType, name, optional, values, deprecated) {
	this.dataType = dataType;
	//Accepted values:
	//'ref'		- FormID
	//'int'		- Integer
	//'float'	- Floating point value
	//'string'	- String literal
	//'void'	- Accepts any value

	//Note: Add proper support for FOSE/NVSE's format strings and other specific strings like actor values

	this.name = name;
	this.optional = optional != undefined && optional != false; //False unless included, otherwise true

	this.values = values != undefined ? values : false; //False unless included, otherwise as specified
	this.deprecated = deprecated != undefined && deprecated != false; //False unless included, otherwise true
}

function scriptFunctionNote(condition, content, level) {
	this.condition = condition;
	//An anonymous function that takes an array containing the calling reference (possibly null) and the function's parameters, and returns true or false.  The note's content will be displayed if this function returns true

	this.content = content;
	//A string to be displayed as a warning or error

	this.level = level;
	//Accepted values:
	//0		- Warning
	//1		- Error
}


//////////////////////////
//Dictionary begins here//
//////////////////////////

dictionary = {
	keywords: {},

	fallout3blocktypes: {},
	newvegasblocktypes: {},
	blocktypes: {},

	values: {},

	fallout3functions: {},
	fosefunctions: {},
	newvegasfunctions: {},
	nvsefunctions: {},
	functions: {}
}

//Keywords
{
	dictionary.keywords['to'] = { type: '2', name: 'to' };

	dictionary.keywords['return'] = {
		type: '2',
		name: 'Return',
		non_contextual_errors: []
	}

	dictionary.keywords['return'].non_contextual_errors[''] = /^(;(.*))?$/;
	dictionary.keywords['return'].non_contextual_errors['Condition not allowed'] = /^[^;]+(;(.*))?$/;

	dictionary.keywords['scriptname'] = {
		type: '1',
		name: 'ScriptName',
		longName: 'ScriptName',
		shortName: 'scn',
		non_contextual_errors: []
	}

	dictionary.keywords['scriptname'].non_contextual_errors[''] = /^([^\d\W]\w*)\s*(;(.*))?$/;
	dictionary.keywords['scriptname'].non_contextual_errors['EditorID missing'] = /^(;(.*))?$/;
	dictionary.keywords['scriptname'].non_contextual_errors['Multiple editorIDs'] = /^[^\s;]+(\s+[^\s;]+)+\s*(;(.*))?$/;
	dictionary.keywords['scriptname'].non_contextual_errors['EditorID starts with a number'] = /^\d\w*\s*(;(.*))?$/;
	dictionary.keywords['scriptname'].non_contextual_errors['EditorID contains invalid character'] = /^(\w*[^\s\w;])+\w*\s*(;(.*))?$/;

	dictionary.keywords['scriptname'].contextual_validate = function(script) {
		switch (script.hasScriptName) {
			//0 - No ScriptName
			//1 - Has ScriptName
			//2 - Has valid code but no ScriptName
		case 1:
			script.pushError('Script already has a ScriptName declaration');
			break;
		case 2:
			script.pushError('ScriptName declaration must take place before any valid code');
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
				if (scriptName.toLowerCase() in script.variables['#local'] || scriptName.toLowerCase() in script.variables['#global'])
					script.pushError('"' + scriptName + '" is a variable name, so cannot be used as an editorID');
				else if (scriptName.toLowerCase() in dictionary.keywords)
					script.pushError('"' + scriptName + '" is a keyword');
				else if (scriptName.toLowerCase() in dictionary.functions)
					script.pushError('"' + scriptName + '" is a function');
				else
					script.editorIDs[scriptName.toLowerCase()] = new editorID('SCPT');
			}
		}
	}

	dictionary.keywords['scn'] = {
		type: '1',
		name: 'scn',
		longName: 'ScriptName',
		shortName: 'scn',
		non_contextual_errors: dictionary.keywords['scriptname'].non_contextual_errors,
		contextual_validate: dictionary.keywords['scriptname'].contextual_validate
	}

	dictionary.keywords['begin'] = {
		type: '1',
		name: 'Begin',
		non_contextual_errors: []
	}

	dictionary.keywords['begin'].non_contextual_errors[''] = /^[^\s;]+(\s+[^\s;]+)*\s*(;(.*))?$/;
	dictionary.keywords['begin'].non_contextual_errors['Blocktype missing'] = /^(;(.*))?$/;

	dictionary.keywords['begin'].contextual_validate = function(script) {
		if (script.inBlock != '') {
			script.pushError('Begin statement illegal within Begin/End block');
			if (script.conditionalLevel) {
				script.pushError(script.conditionalLevel + ' endif statement' + (script.conditionalLevel > 1 ? 's' : '') + ' missing in block ' + script.blockNumber);
				script.conditionalLevel = 0;
			}
		}

		script.indentIncrement = -1;

		var blocktype = script.input[script.lineNumber].match(/^\s*begin\s+(\w+)/i);
		blocktype = blocktype == null ? 'unknown' : blocktype[1].toLowerCase();
		script.inBlock = blocktype;

		if (script.isValid == true) {//Potentially valid blocktype present
			if (!(blocktype in dictionary.blocktypes))
				script.pushError('Invalid blocktype');
			else {
				var availableScriptTypes = 14 & dictionary.blocktypes[blocktype].scriptType; //14 - all types but result
				if (script.scriptType & availableScriptTypes)
					script.scriptType &= availableScriptTypes
				else
					script.pushError('Blocktype invalid for this type of script');
			}
		}

		if (script.scriptType & 1) //Result
			script.scriptType--;

		script.blockNumber++;
	}

	dictionary.keywords['end'] = {
		type: '1',
		name: 'End',
		non_contextual_errors: []
	}

	dictionary.keywords['end'].non_contextual_errors[''] = /^(;(.*))?$/;
	dictionary.keywords['end'].non_contextual_errors['Condition not allowed'] = /^[^;]+(;(.*))?$/;

	dictionary.keywords['end'].contextual_validate = function(script) {
		if (script.inBlock == '')
			script.pushError('End statement illegal outside Begin/End block');
		else
			script.inBlock = '';

		if (script.conditionalLevel) {
			script.pushError(script.conditionalLevel + ' endif statement' + (script.conditionalLevel > 1 ? 's' : '') + ' missing');
			script.conditionalLevel = 0;
		}

		if (script.scriptType & 1) //Result
			script.scriptType--;
	}

	dictionary.keywords['if'] = {
		type: '1',
		name: 'if',
		non_contextual_errors: []
	}

	dictionary.keywords['if'].non_contextual_errors[''] = /^[^;]+(;(.*))?$/;
	dictionary.keywords['if'].non_contextual_errors['Condition missing'] = /^(;(.*))?$/;

	dictionary.keywords['if'].contextual_validate = function(script) {
		script.conditionalLevel++;
		script.indentIncrement = -1;

		script.elseDone[script.conditionalLevel] = 0;

		if (script.conditionalLevel > 10)
			script.pushError('Too many nested if statements');

		if (script.isValid == true)
			validateExpression(script.input[script.lineNumber].replace(/^\s*if\s*/i, "").match(/^([^\s]*(\s*([^"';\s]*|"[^"]*?"|'[^']*?'))*)\s*(;(.*))?$/)[1]);
	}

	dictionary.keywords['elseif'] = {
		type: '1',
		name: 'elseif',
		non_contextual_errors: dictionary.keywords['if'].non_contextual_errors
	}

	dictionary.keywords['elseif'].contextual_validate = function(script) {
		if (script.conditionalLevel)
			script.indentIncrement = -1;
		else {
			script.conditionalLevel = 1;
			script.pushError('elseif statement invalid without preceeding if statement');
		}

		if (script.elseDone[script.conditionalLevel])
			script.pushError('elseif statement invalid after else statement on line ' + script.elseDone[script.conditionalLevel]);

		if (script.isValid == true)
			validateExpression(script.input[script.lineNumber].replace(/^\s*elseif\s*/i, "").match(/^([^\s]*(\s*([^"';\s]*|"[^"]*?"|'[^']*?'))*)\s*(;(.*))?$/)[1]);
	}

	dictionary.keywords['else'] = {
		type: '1',
		name: 'else',
		non_contextual_errors: dictionary.keywords['end'].non_contextual_errors
	}

	dictionary.keywords['else'].contextual_validate = function(script) {
		if (script.conditionalLevel)
			script.indentIncrement = -1;
		else {
			script.conditionalLevel = 1;
			script.pushError('else statement invalid without preceeding if statement');
		}

		if (script.elseDone[script.conditionalLevel])
			script.pushError('else statement invalid after else statement on line ' + script.elseDone[script.conditionalLevel]);
		else
			script.elseDone[script.conditionalLevel] = script.lineNumber;
	}

	dictionary.keywords['endif'] = {
		type: '1',
		name: 'endif',
		non_contextual_errors: dictionary.keywords['else'].non_contextual_errors
	}

	dictionary.keywords["endif"].contextual_validate = function(script) {
		if (script.conditionalLevel)
			script.conditionalLevel--;
		else
			script.pushError('endif statement invalid without preceeding if statement');
	}

	dictionary.keywords['set'] = {
		type: '2',
		name: 'set',
		non_contextual_errors: []
	}

	dictionary.keywords['set'].non_contextual_errors[''] = /^([^\d\W]\w*\.)?\w+\s+to\s+[^;]+(;(.*))?$/i;
	dictionary.keywords['set'].non_contextual_errors['EditorID starts with a number'] = /^\d[^\s;]*\.\w+\s+to\s+[^;]+\s*(;(.*))?$/i;
	dictionary.keywords['set'].non_contextual_errors['EditorID contains invalid character'] = /^[^\s;]+\.\w+\s+to\s+[^;]+\s*(;(.*))?$/i;
	dictionary.keywords['set'].non_contextual_errors['Invalid variable name'] = /^[^\s;]+\s+to\s+[^;]+\s*(;(.*))?$/i;
	dictionary.keywords['set'].non_contextual_errors['Variable name missing'] = /^(to\s+[^;]*)?\s*(;(.*))?$/i;
	dictionary.keywords['set'].non_contextual_errors['Expression missing'] = /^[^\s;]+(\.\w+)?\s+to\s*(;(.*))?$/i;
	dictionary.keywords['set'].non_contextual_errors['"to" missing'] = /^[^\s;]+(\.\w+)?(\s+[^\s;]+)*\s*(;(.*))?$/i;

	dictionary.keywords['set'].contextual_validate = function(script) {
		var incrSets;

		if (script.isValid == true) {
			var ID = script.input[script.lineNumber].match(/^\s*set\s+((\w+)\.)?(\w+)\s+to\s+([^;])+(;(.*))?$/i)[2];
			var varName = script.input[script.lineNumber].match(/^\s*set\s+((\w+)\.)?(\w+)\s+to\s+([^;])+(;(.*))?$/i)[3];

			if (ID != undefined && ID != '') {
				if (!(ID.toLowerCase() in script.editorIDs)) {
					if (ID.toLowerCase() in script.variables['#local'] || ID.toLowerCase() in script.variables['#global'])
						script.pushError('"' + ID + '" is a variable name, so cannot be used as an editorID');
					else if (ID.toLowerCase() in dictionary.keywords)
						script.pushError('"' + ID + '" is a keyword');
					else
						script.editorIDs[ID.toLowerCase()] = new editorID();
				}
			}

			if (varName.toLowerCase() in script.variables['#local'] == false || (ID != undefined && ID != '')) {
				if (varName.toLowerCase() in script.editorIDs)
					script.pushError('"' + varName + '" is an editorID for a non-global form');
				else if (varName.toLowerCase() in dictionary.keywords)
					script.pushError('"' + varName + '" is a keyword');
				else if (varName.toLowerCase() in dictionary.functions)
					script.pushError('"' + varName + '" is a function');
				else if (ID == undefined && !(varName in script.variables['#global'])) {
					script.variables['#global'][varName.toLowerCase()] = new variable(varName);
					script.pushWarning('"' + varName + '" is not declared in this script.  Make sure it is a global variable')
				} else {
					if (ID == 'constructor')
						ID = '#constructor';
					if (!(ID in script.variables))
						script.variables[ID] = {};
					script.variables[ID][varName.toLowerCase()] = new variable(varName);
				}
			} else if (varName.toLowerCase() in script.variables['#local'])
				incrSets = 1;

			if (script.isValid == true)
				validateExpression(script.input[script.lineNumber].replace(/^\s*set\s+([^\W\d]\w+\.)?\w+\s+to\s*/i, "").match(/^([^\s]*(\s*([^"';\s]*|"[^"]*?"|'[^']*?'))*)\s*(;(.*))?$/)[1]);

			if (incrSets == 1)
				script.variables['#local'][varName.toLowerCase()].sets++;
		}
	}

	dictionary.keywords['int'] = {
		type: '2',
		name: 'int',
		non_contextual_errors: []
	}

	dictionary.keywords['int'].contextual_validate = function(script) {
		if (script.inBlock != '') {
			script.pushError('Variable declaration illegal within Begin/End block');
		}

		var varName = trim(script.input[script.lineNumber]).replace(/^\w+\s+/, "").replace(/\s*(;(.*))?$/, "");

		if (script.isValid == true) {
			if (varName.toLowerCase() in script.variables['#local'])
				script.pushError('Variable "' + varName + '" has already been declared');
			else if (varName.toLowerCase() in script.variables['#global'])
				script.pushError('"' + varName + '" is the name of a global variable');
			else if (varName.toLowerCase() in dictionary.keywords)
				script.pushError('"' + varName + '" is a keyword');
			else if (varName.toLowerCase() in script.editorIDs)
				script.pushError('"' + varName + '" is an editorID for a non-global form');
			else
				script.variables['#local'][varName.toLowerCase()] = new variable(varName, 'int');
		}
	}

	dictionary.keywords['int'].non_contextual_errors[''] = /^\w*[^\W\d]+\w*\s*(;(.*))?$/;
	dictionary.keywords['int'].non_contextual_errors['Variable name missing'] = /^(;(.*))?$/;
	dictionary.keywords['int'].non_contextual_errors['Variable name cannot be a number'] = /^\d+\s*(;(.*))?$/;
	dictionary.keywords['int'].non_contextual_errors['Multiple variable names'] = /^[^\s;]+(\s+[^\s;]+)+\s*(;(.*))?$/;
	dictionary.keywords['int'].non_contextual_errors['Variable name contains invalid character'] = /^(\w*[^\s\w;])+\w*\s*(;(.*))?$/;

	dictionary.keywords['short'] = {
		type: '2',
		name: 'short',
		shortName: 'int',
		non_contextual_errors: dictionary.keywords['int'].non_contextual_errors,
		contextual_validate: dictionary.keywords['int'].contextual_validate
	}

	dictionary.keywords['long'] = {
		type: '2',
		name: 'int',
		shortName: 'int',
		non_contextual_errors: dictionary.keywords['int'].non_contextual_errors,
		contextual_validate: dictionary.keywords['int'].contextual_validate
	}

	dictionary.keywords['float'] = {
		type: '2',
		name: 'float',
		non_contextual_errors: dictionary.keywords['int'].non_contextual_errors
	}

	dictionary.keywords['float'].contextual_validate = function(script) {
		if (script.inBlock != '') {
			script.pushError('Variable declaration illegal within Begin/End block');
		}

		var varName = trim(script.input[script.lineNumber]).replace(/^\w+\s+/, '').replace(/\s*(;(.*))?$/, '');

		if (script.isValid == true) {
			if (varName.toLowerCase() in script.variables['#local'])
				script.pushError('Variable "' + varName + '" has already been declared');
			else if (varName.toLowerCase() in script.variables['#global'])
				script.pushError('"' + varName + '" is the name of a global variable');
			else if (varName.toLowerCase() in dictionary.keywords)
				script.pushError('"' + varName + '" is a keyword');
			else if (varName.toLowerCase() in script.editorIDs)
				script.pushError('"' + varName + '" is an editorID for a non-global form');
			else
				script.variables['#local'][varName.toLowerCase()] = new variable(varName, 'float');
		}
	}

	dictionary.keywords['ref'] = {
		type: '2',
		name: 'ref',
		non_contextual_errors: dictionary.keywords['int'].non_contextual_errors
	}

	dictionary.keywords['ref'].contextual_validate = function(script) {
		if (script.inBlock != '') {
			script.pushError('Variable declaration illegal within Begin/End block');
		}

		var varName = trim(script.input[script.lineNumber]).replace(/^\w+\s+/, '').replace(/\s*(;(.*))?$/, '');

		if (script.isValid == true) {
			if (varName.toLowerCase() in script.variables['#local'])
				script.pushError('Variable "' + varName + '" has already been declared');
			else if (varName.toLowerCase() in script.variables['#global'])
				script.pushError('"' + varName + '" is the name of a global variable');
			else if (varName.toLowerCase() in dictionary.keywords)
				script.pushError('"' + varName + '" is a keyword');
			else if (varName.toLowerCase() in script.editorIDs)
				script.pushError('"' + varName + '" is an editorID for a non-global form');
			else
				script.variables['#local'][varName.toLowerCase()] = new variable(varName, 'ref');
		}
	}
	dictionary.keywords['reference'] = {
		type: '2',
		name: 'reference',
		shortName: 'ref',
		non_contextual_errors: dictionary.keywords['ref'].non_contextual_errors,
		contextual_validate: dictionary.keywords['ref'].contextual_validate
	}
}

//Blocktypes
{
	//Fallout 3
	{
		dictionary.fallout3blocktypes['gamemode'] = new blocktype(7, {docLink: 'http://geck.bethsoft.com/index.php/GameMode', name: 'GameMode'});
		dictionary.fallout3blocktypes['menumode'] = new blocktype(7, {docLink: 'http://geck.bethsoft.com/index.php/MenuMode', name: 'MenuMode'});
		dictionary.fallout3blocktypes['onactivate'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnActivate', name: 'OnActivate'});
		dictionary.fallout3blocktypes['onactorequip'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnActorEquip', name: 'OnActorEquip'});
		dictionary.fallout3blocktypes['onactorunequip'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnActorUnequip', name: 'OnActorUnequip'});
		dictionary.fallout3blocktypes['onadd'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnAdd', name: 'OnAdd'});
		dictionary.fallout3blocktypes['onclose'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnClose', name: 'OnClose'});
		dictionary.fallout3blocktypes['oncombatend'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnCombatEnd', name: 'OnCombatEnd'});
		dictionary.fallout3blocktypes['ondeath'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnDeath', name: 'OnDeath'});
		dictionary.fallout3blocktypes['ondestructionstagechange'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnDestructionStageChange', name: 'OnDestructionStageChange'});
		dictionary.fallout3blocktypes['ondrop'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnDrop', name: 'OnDrop'});
		dictionary.fallout3blocktypes['onequip'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnEquip', name: 'OnEquip'});
		dictionary.fallout3blocktypes['ongrab'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnGrab', name: 'OnGrab'});
		dictionary.fallout3blocktypes['onhit'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnHit', name: 'OnHit'});
		dictionary.fallout3blocktypes['onhitwith'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnHitWith', name: 'OnHitWith'});
		dictionary.fallout3blocktypes['onload'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnLoad', name: 'OnLoad'});
		dictionary.fallout3blocktypes['onmagiceffecthit'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnMagicEffectHit', name: 'OnMagicEffectHit'});
		dictionary.fallout3blocktypes['onmurder'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnMurder', name: 'OnMurder'});
		dictionary.fallout3blocktypes['onopen'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnOpen', name: 'OnOpen'});
		dictionary.fallout3blocktypes['onpackagechange'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnPackageChange', name: 'OnPackageChange'});
		dictionary.fallout3blocktypes['onpackagedone'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnPackageDone', name: 'OnPackageDone'});
		dictionary.fallout3blocktypes['onpackagestart'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnPackageStart', name: 'OnPackageStart'});
		dictionary.fallout3blocktypes['onrelease'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnRelease', name: 'OnRelease'});
		dictionary.fallout3blocktypes['onreset'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnReset', name: 'OnReset'});
		dictionary.fallout3blocktypes['onsell'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnSell', name: 'OnSell'});
		dictionary.fallout3blocktypes['onstartcombat'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnStartCombat', name: 'OnStartCombat'});
		dictionary.fallout3blocktypes['ontrigger'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnTrigger', name: 'OnTrigger'});
		dictionary.fallout3blocktypes['ontriggerenter'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnTriggerEnter', name: 'OnTriggerEnter'});
		dictionary.fallout3blocktypes['ontriggerleave'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnTriggerLeave', name: 'OnTriggerLeave'});
		dictionary.fallout3blocktypes['onunequip'] = new blocktype(4, {docLink: 'http://geck.bethsoft.com/index.php/OnUnequip', name: 'OnUnequip'});
		dictionary.fallout3blocktypes['saytodone'] = new blocktype(6, {docLink: 'http://geck.bethsoft.com/index.php/SayToDone', name: 'SayToDone'});
		dictionary.fallout3blocktypes['scripteffectfinish'] = new blocktype(8, {docLink: 'http://geck.bethsoft.com/index.php/ScriptEffectFinish', name: 'ScriptEffectFinish'});
		dictionary.fallout3blocktypes['scripteffectstart'] = new blocktype(8, {docLink: 'http://geck.bethsoft.com/index.php/ScriptEffectStart', name: 'ScriptEffectStart'});
		dictionary.fallout3blocktypes['scripteffectupdate'] = new blocktype(8, {docLink: 'http://geck.bethsoft.com/index.php/ScriptEffectUpdate', name: 'ScriptEffectUpdate'});
	}

	//New Vegas
	{
		dictionary.newvegasblocktypes = combineObjects([dictionary.fallout3blocktypes]);
	}

	dictionary.blocktypes = combineObjects([dictionary.fallout3blocktypes]);
}

//Values
{
	dictionary.values.attributes = {
		strength: 'Strength',
		perception: 'Perception',
		endurance: 'Endurance',
		charisma: 'Charisma',
		intelligence: 'Intelligence',
		agility: 'Agility',
		luck: 'Luck'
	}

	dictionary.values.skills = {
		barter: 'Barter',
		bigguns: 'BigGuns',
		energyweapons: 'EnergyWeapons',
		explosives: 'Explosives',
		lockpick: 'Lockpick',
		medicine: 'Medicine',
		meleeweapons: 'MeleeWeapons',
		repair: 'Repair',
		science: 'Science',
		smallguns: 'SmallGuns',
		sneak: 'Sneak',
		speech: 'Speech',
		throwing: 'Throwing',
		unarmed: 'Unarmed'
	}

	dictionary.values.actorValues = {
		actionpoints: 'ActionPoints',
		carryweight: 'CarryWeight',
		critchance: 'CritChance',
		healrate: 'HealRate',
		health: 'Health',
		meleedamage: 'MeleeDamage',
		unarmeddamage: 'UnarmedDamage',
		damageresist: 'DamageResist',
		poisonresist: 'PoisonResist',
		radresist: 'RadResist',
		speedmult: 'SpeedMult',
		fatigue: 'Fatigue',
		karma: 'Karma',
		xp: 'XP',
		perceptioncondition: 'PerceptionCondition',
		endurancecondition: 'EnduranceCondition',
		leftattackcondition: 'LeftAttackCondition',
		rightattackcondition: 'RightAttackCondition',
		leftmobilitycondition: 'LeftMobilityCondition',
		rightmobilitycondition: 'RightMobilityCondition',
		braincondition: 'BrainCondition',
		aggression: 'Aggression',
		assistance: 'Assistance',
		confidence: 'Confidence',
		energy: 'Energy',
		responsibility: 'Responsibility',
		mood: 'Mood',
		inventoryweight: 'InventoryWeight',
		paralysis: 'Paralysis',
		invisibility: 'Invisibility',
		chameleon: 'Chameleon',
		nighteye: 'NightEye',
		detectliferange: 'DetectLifeRange',
		fireresist: 'FireResist',
		waterbreathing: 'WaterBreathing',
		radiationrads: 'RadiationRads',
		bloodymess: 'BloodyMess',
		ignorecrippledlimbs: 'IgnoreCrippledLimbs',
		variable01: 'Variable01',
		variable02: 'Variable02',
		variable03: 'Variable03',
		variable04: 'Variable04',
		variable05: 'Variable05',
		variable06: 'Variable06',
		variable07: 'Variable07',
		variable08: 'Variable08',
		variable09: 'Variable09',
		variable10: 'Variable10'
	};
	dictionary.values.actorValues = combineObjects([dictionary.values.attributes, dictionary.values.skills, dictionary.values.actorValues])

	dictionary.values.axes = { x: 'X', y: 'Y', z: 'Z' };

	dictionary.values.menuModes = {
		0: '0',
		1: '1',
		2: '2',
		3: '3',
		1001: '1001',
		1002: '1002',
		1003: '1003',
		1004: '1004',
		1007: '1007',
		1008: '1008',
		1009: '1009',
		1012: '1012',
		1013: '1013',
		1014: '1014',
		1016: '1016',
		1023: '1023',
		1027: '1027',
		1035: '1035',
		1036: '1036',
		1047: '1047',
		1048: '1048',
		1051: '1051',
		1053: '1053',
		1054: '1054',
		1055: '1055',
		1056: '1056',
		1057: '1057',
		1058: '1058',
		1059: '1059',
		1060: '1060'
	};
}

//Fallout 3 Functions
{
	dictionary.fallout3functions['unusedfunction0'] = new scriptFunction('void', 'D', 0, [], {name: 'UnusedFunction0'});
	dictionary.fallout3functions['getdistance'] = new scriptFunction('float', 'R', 0, [new scriptFunctionParam('ref', 'Target')], {docLink: 'http://geck.bethsoft.com/index.php/GetDistance', name: 'GetDistance'}, [new scriptFunctionNote(
		function(functionCall) {
			if (functionCall[0] != null)
				return functionCall[0].toLowerCase() in {player: 1, playerref: 1};
			else 
				return false;
		},
		'GetDistance shouldn\'t be called on the player.  Pass "player" as a parameter of GetDistance instead',
		1), new scriptFunctionNote(
		function(functionCall) {
			if (functionCall[0] != null && functionCall[1] != null)
				return functionCall[0].toLowerCase() == functionCall[1].toLowerCase();
			else 
				return false;
		},
		'You are calling GetDistance on the same reference as you are passing as its parameter',
		1)]);
	dictionary.fallout3functions['additem'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'ObjectID'), new scriptFunctionParam('int', 'Count'), new scriptFunctionParam('int', 'HideMessageFlag', true)], {docLink: 'http://geck.bethsoft.com/index.php/AddItem', name: 'AddItem'});
	dictionary.fallout3functions['setessential'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('ref', 'BaseID'), new scriptFunctionParam('boolean', 'Flag')], {docLink: 'http://geck.bethsoft.com/index.php/SetEssential', name: 'SetEssential'});
	dictionary.fallout3functions['rotate'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('string', 'Axis'), new scriptFunctionParam('float', 'DegreesPerSec')], {docLink: 'http://geck.bethsoft.com/index.php/Rotate', name: 'Rotate'});
	dictionary.fallout3functions['getlocked'] = new scriptFunction('bool', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetLocked', name: 'GetLocked'}); //0, 1
	dictionary.fallout3functions['getpos'] = new scriptFunction('float', 'R', 0, [new scriptFunctionParam('string', 'Axis', false, dictionary.values.axes)], {docLink: 'http://geck.bethsoft.com/index.php/GetPos', name: 'GetPos'});
	dictionary.fallout3functions['setpos'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('string', 'Axis', false, dictionary.values.axes), new scriptFunctionParam('float', 'Pos')], {docLink: 'http://geck.bethsoft.com/index.php/SetPos', name: 'SetPos'});
	dictionary.fallout3functions['getangle'] = new scriptFunction('float', 'R', 0, [new scriptFunctionParam('string', 'Axis', false, dictionary.values.axes)], {docLink: 'http://geck.bethsoft.com/index.php/GetAngle', name: 'GetAngle'});
	dictionary.fallout3functions['setangle'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('string', 'Axis', false, dictionary.values.axes), new scriptFunctionParam('float', 'Angle')], {docLink: 'http://geck.bethsoft.com/index.php/SetAngle', name: 'SetAngle'});
	dictionary.fallout3functions['getstartingpos'] = new scriptFunction('float', 'R', 0, [new scriptFunctionParam('string', 'Axis', false, dictionary.values.axes)], {docLink: 'http://geck.bethsoft.com/index.php/GetStartingPos', name: 'GetStartingPos'});
	dictionary.fallout3functions['getstartingangle'] = new scriptFunction('float', 'R', 0, [new scriptFunctionParam('string', 'Axis', false, dictionary.values.axes)], {docLink: 'http://geck.bethsoft.com/index.php/GetStartingAngle', name: 'GetStartingAngle'});
	dictionary.fallout3functions['getsecondspassed'] = new scriptFunction('float', 'B', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetSecondsPassed', name: 'GetSecondsPassed'}, [new scriptFunctionNote(
		function(functionCall) {return script.inBlock.toLowerCase() == 'scripteffectupdate';}, 'Use "ScriptEffectElapsedSeconds" instead of "GetSecondsPassed" in a "ScriptEffectUpdate" block', 0), new scriptFunctionNote(
		function(functionCall) {return !(script.inBlock.toLowerCase() in {'scripteffectupdate': 1, 'ontrigger': 1, 'gamemode': 1, 'menumode': 1});}, '"GetSecondsPassed" should not be used in this type of Begin/End block, as it does not run continuously', 1)]);
	dictionary.fallout3functions['activate'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'ActionRef', true), new scriptFunctionParam('int', 'RunOnActivateBlockFlag', true)], {docLink: 'http://geck.bethsoft.com/index.php/Activate', name: 'Activate'}); //ActionRef param can be omitted if called in OnActivate block
	dictionary.fallout3functions['getactorvalue'] = new scriptFunction('float', 'R', 0, [new scriptFunctionParam('string', 'StatName', false, dictionary.values.actorValues)], {docLink: 'http://geck.bethsoft.com/index.php/GetActorValue', name: 'GetActorValue', shortName: 'GetAV', longName: 'GetActorValue'});
	dictionary.fallout3functions['getav'] = alias(dictionary.fallout3functions['getactorvalue']);
	dictionary.fallout3functions['setactorvalue'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('string', 'StatName', false, dictionary.values.actorValues), new scriptFunctionParam('float', 'Value')], {docLink: 'http://geck.bethsoft.com/index.php/SetActorValue', name: 'SetActorValue', shortName: 'SetAV', longName: 'SetActorValue'});
	dictionary.fallout3functions['setav'] = alias(dictionary.fallout3functions['setactorvalue']);
	dictionary.fallout3functions['modactorvalue'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('string', 'StatName', false, dictionary.values.actorValues), new scriptFunctionParam('float', 'Value')], {docLink: 'http://geck.bethsoft.com/index.php/ModActorValue', name: 'ModActorValue', shortName: 'ModAV', longName: 'ModActorValue'});
	dictionary.fallout3functions['modav'] = alias(dictionary.fallout3functions['modactorvalue']);
	dictionary.fallout3functions['setatstart'] = new scriptFunction('void', 'D', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/SetAtStart', name: 'SetAtStart'});
	dictionary.fallout3functions['getcurrenttime'] = new scriptFunction('float', 'B', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetCurrentTime', name: 'GetCurrentTime'});
	dictionary.fallout3functions['playgroup'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('string', 'AnimGroup'), new scriptFunctionParam('int', 'InitFlag')], {docLink: 'http://geck.bethsoft.com/index.php/PlayGroup', name: 'PlayGroup'});
	dictionary.fallout3functions['loopgroup'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('string', 'AnimGroup'), new scriptFunctionParam('int', 'InitFlag')], {docLink: 'http://geck.bethsoft.com/index.php/LoopGroup', name: 'LoopGroup'});
	dictionary.fallout3functions['skipanim'] = new scriptFunction('void', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/SkipAnim', name: 'SkipAnim'});
	dictionary.fallout3functions['startcombat'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'ActorID', true)], {docLink: 'http://geck.bethsoft.com/index.php/StartCombat', name: 'StartCombat'});
	dictionary.fallout3functions['stopcombat'] = new scriptFunction('void', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/StopCombat', name: 'StopCombat'});
	dictionary.fallout3functions['getscale'] = new scriptFunction('float', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetScale', name: 'GetScale'});
	dictionary.fallout3functions['ismoving'] = new scriptFunction('bool', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsMoving', name: 'IsMoving'}); //0, 1, 2, 3, 4
	dictionary.fallout3functions['isturning'] = new scriptFunction('bool', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsTurning', name: 'IsTurning'}); //0, 1, 2
	dictionary.fallout3functions['getlineofsight'] = new scriptFunction('bool', 'R', 0, [new scriptFunctionParam('ref', 'ObjectID')], {docLink: 'http://geck.bethsoft.com/index.php/GetLineOfSight', name: 'GetLineOfSight', shortName: 'GetLOS', longName: 'GetLineOfSight'}); //0, 1
	dictionary.fallout3functions['getlos'] = alias(dictionary.fallout3functions['getlineofsight']); //0, 1
	dictionary.fallout3functions['addspell'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'EffectID')], {docLink: 'http://geck.bethsoft.com/index.php/AddSpell', name: 'AddSpell'});
	dictionary.fallout3functions['removespell'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'EffectID')], {docLink: 'http://geck.bethsoft.com/index.php/RemoveSpell', name: 'RemoveSpell'});
	dictionary.fallout3functions['cast'] = new scriptFunction('void', 'D', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/Cast', name: 'Cast'}, [new scriptFunctionNote(
		function(functionCall) {return true;},
		'Use CastImmediateOnSelf instead',
		1)]);
	dictionary.fallout3functions['getbuttonpressed'] = new scriptFunction('int', 'B', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetButtonPressed', name: 'GetButtonPressed'}, [new scriptFunctionNote(
		function(functionCall) {return !(script.inBlock.toLowerCase() in {'scripteffectupdate': 1, 'ontrigger': 1, 'gamemode': 1, 'menumode': 1});}, '"GetButtonPressed" should not be used in this type of Begin/End block, as it does not run continuously', 1)]);
	dictionary.fallout3functions['getinsamecell'] = new scriptFunction('bool', 'R', 0, [new scriptFunctionParam('ref', 'Target')], {docLink: 'http://geck.bethsoft.com/index.php/GetInSameCell', name: 'GetInSameCell'});
	dictionary.fallout3functions['enable'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('int', 'FadeIn', true)], {docLink: 'http://geck.bethsoft.com/index.php/Enable', name: 'Enable'});
	dictionary.fallout3functions['disable'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('int', 'FadeIn', true)], {docLink: 'http://geck.bethsoft.com/index.php/Disable', name: 'Disable'});
	dictionary.fallout3functions['getdisabled'] = new scriptFunction('bool', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetDisabled', name: 'GetDisabled'}); //0, 1
	dictionary.fallout3functions['menumode'] = new scriptFunction('bool', 'B', 0, [new scriptFunctionParam('int', 'Menu Number', true, dictionary.values.menuModes)], {docLink: 'http://geck.bethsoft.com/index.php/MenuMode_(Function)', name: 'MenuMode'});
	dictionary.fallout3functions['placeatme'] = new scriptFunction('ref', 'R', 0, [new scriptFunctionParam('ref', 'ObjectID'), new scriptFunctionParam('int', 'Count', true), new scriptFunctionParam('float', 'Distance', true, false, true), new scriptFunctionParam('int', 'Direction', true, {0: '0', 1: '1', 2: '2', 3: '3'}, true)], {docLink: 'http://geck.bethsoft.com/index.php/PlaceAtMe', name: 'PlaceAtMe'});
	dictionary.fallout3functions['playsound'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('ref', 'SoundID')], {docLink: 'http://geck.bethsoft.com/index.php/PlaySound', name: 'PlaySound'});
	dictionary.fallout3functions['getdisease'] = new scriptFunction('void', 'D', 0, [], {name: 'GetDisease'});
	dictionary.fallout3functions['getvampire'] = new scriptFunction('void', 'D', 0, [], {name: 'GetVampire'});
	dictionary.fallout3functions['getclothingvalue'] = new scriptFunction('float', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetClothingValue', name: 'GetClothingValue'});
	dictionary.fallout3functions['samefaction'] = new scriptFunction('bool', 'R', 0, [new scriptFunctionParam('ref', 'ActorID')], {docLink: 'http://geck.bethsoft.com/index.php/SameFaction', name: 'SameFaction'});
	dictionary.fallout3functions['samerace'] = new scriptFunction('bool', 'R', 0, [new scriptFunctionParam('ref', 'ActorID')], {docLink: 'http://geck.bethsoft.com/index.php/SameRace', name: 'SameRace'});
	dictionary.fallout3functions['samesex'] = new scriptFunction('bool', 'R', 0, [new scriptFunctionParam('ref', 'ActorID')], {docLink: 'http://geck.bethsoft.com/index.php/SameSex', name: 'SameSex'});
	dictionary.fallout3functions['getdetected'] = new scriptFunction('bool', 'R', 0, [new scriptFunctionParam('ref', 'ActorID')], {docLink: 'http://geck.bethsoft.com/index.php/GetDetected', name: 'GetDetected'});
	dictionary.fallout3functions['getdead'] = new scriptFunction('bool', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetDead', name: 'GetDead'});
	dictionary.fallout3functions['getitemcount'] = new scriptFunction('int', 'R', 0, [new scriptFunctionParam('ref', 'ObjectID')], {docLink: 'http://geck.bethsoft.com/index.php/GetItemCount', name: 'GetItemCount'}, [new scriptFunctionNote(
		function(functionCall) {return (/caps001/i.test(functionCall[1]));},
		'GetGold is more reliable than "GetItemCount" when checking how many caps an actor has in their inventory',
		0)]); //GetGold better for Caps001?
	dictionary.fallout3functions['getgold'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetGold', name: 'GetGold'}); //0+
	dictionary.fallout3functions['getsleeping'] = new scriptFunction('bool', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetSleeping', name: 'GetSleeping'}); //0, 1, 2, 3, 4
	dictionary.fallout3functions['gettalkedtopc'] = new scriptFunction('bool', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetTalkedToPC', name: 'GetTalkedToPC'}); //0, 1
	dictionary.fallout3functions['say'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('int', 'ForceSubtitleFlag', true), new scriptFunctionParam('ref', 'Actor', true), new scriptFunctionParam('int', 'Undocumented int', true)], {docLink: 'http://geck.bethsoft.com/index.php/Say', name: 'Say'})
	dictionary.fallout3functions['sayto'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'TargetActor'), new scriptFunctionParam('ref', 'TopicID'), new scriptFunctionParam('int', 'ForceSubtitleFlag', true), new scriptFunctionParam('int', 'NoTargetLook', true)], {docLink: 'http://geck.bethsoft.com/index.php/SayTo', name: 'SayTo'});
	dictionary.fallout3functions['getscriptvariable'] = new scriptFunction('int', 'B', 0, [new scriptFunctionParam('ref', 'ObjectID'), new scriptFunctionParam('string', 'VarName')], {docLink: 'http://geck.bethsoft.com/index.php/GetScriptVariable', name: 'GetScriptVariable'}, [new scriptFunctionNote(
		function(functionCall) {return true;}, '"GetScriptVariable" is only available in conditions.  Use "ObjectID.VarName" for remote variable access in scripts', 1)]); //Depends on target
	dictionary.fallout3functions['startquest'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('ref', 'QuestName')], {docLink: 'http://geck.bethsoft.com/index.php/StartQuest', name: 'StartQuest'});
	dictionary.fallout3functions['stopquest'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('ref', 'QuestName')], {docLink: 'http://geck.bethsoft.com/index.php/StopQuest', name: 'StopQuest'});
	dictionary.fallout3functions['getquestrunning'] = new scriptFunction('bool', 'B', 0, [new scriptFunctionParam('ref', 'QuestName')], {docLink: 'http://geck.bethsoft.com/index.php/GetQuestRunning', name: 'GetQuestRunning', shortName: 'GetQR', longName: 'GetQuestRunning'}); //0, 1
	dictionary.fallout3functions['getqr'] = alias(dictionary.fallout3functions['getquestrunning']); //0, 1
	dictionary.fallout3functions['setstage'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('ref', 'QuestName'), new scriptFunctionParam('int', 'StageIndex')], {docLink: 'http://geck.bethsoft.com/index.php/SetStage', name: 'SetStage'});
	dictionary.fallout3functions['getstage'] = new scriptFunction('int', 'B', 0, [new scriptFunctionParam('ref', 'QuestName')], {docLink: 'http://geck.bethsoft.com/index.php/GetStage', name: 'GetStage'}); //0+
	dictionary.fallout3functions['getstagedone'] = new scriptFunction('bool', 'B', 0, [new scriptFunctionParam('ref', 'QuestName'), new scriptFunctionParam('int', 'StageIndex')], {docLink: 'http://geck.bethsoft.com/index.php/GetStageDone', name: 'GetStageDone'}); //0, 1
	dictionary.fallout3functions['getfactionrankdifference'] = new scriptFunction('int', 'R', 0, [new scriptFunctionParam('ref', 'FactionID'), new scriptFunctionParam('ref', 'ActorID')], {docLink: 'http://geck.bethsoft.com/index.php/GetFactionRankDifference', name: 'GetFactionRankDifference'});
	dictionary.fallout3functions['getalarmed'] = new scriptFunction('bool', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetAlarmed', name: 'GetAlarmed'});
	dictionary.fallout3functions['israining'] = new scriptFunction('bool', 'B', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsRaining', name: 'IsRaining'});
	dictionary.fallout3functions['getattacked'] = new scriptFunction('bool', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetAttacked', name: 'GetAttacked'});
	dictionary.fallout3functions['getiscreature'] = new scriptFunction('bool', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetIsCreature', name: 'GetIsCreature'});
	dictionary.fallout3functions['getlocklevel'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetLockLevel', name: 'GetLockLevel'});
	dictionary.fallout3functions['getshouldattack'] = new scriptFunction('bool', 'R', 0, [new scriptFunctionParam('ref', 'TargetActor')], {docLink: 'http://geck.bethsoft.com/index.php/GetShouldAttack', name: 'GetShouldAttack'});
	dictionary.fallout3functions['getincell'] = new scriptFunction('bool', 'R', 0, [new scriptFunctionParam('ref', 'CellID')], {docLink: 'http://geck.bethsoft.com/index.php/GetInCell', name: 'GetInCell'});
	dictionary.fallout3functions['getisclass'] = new scriptFunction('bool', 'R', 0, [new scriptFunctionParam('string', 'ClassID')], {docLink: 'http://geck.bethsoft.com/index.php/GetIsClass', name: 'GetIsClass'});
	dictionary.fallout3functions['getisrace'] = new scriptFunction('bool', 'R', 0, [new scriptFunctionParam('ref', 'RaceID')], {docLink: 'http://geck.bethsoft.com/index.php/GetIsRace', name: 'GetIsRace'});
	dictionary.fallout3functions['getissex'] = new scriptFunction('bool', 'R', 0, [new scriptFunctionParam('string', 'Sex', false, {male: 'Male', female: 'Female'})], {docLink: 'http://geck.bethsoft.com/index.php/GetIsSex', name: 'GetIsSex'});
	dictionary.fallout3functions['getinfaction'] = new scriptFunction('bool', 'R', 0, [new scriptFunctionParam('ref', 'FactionID')], {docLink: 'http://geck.bethsoft.com/index.php/GetInFaction', name: 'GetInFaction'});
	dictionary.fallout3functions['getisid'] = new scriptFunction('bool', 'R', 0, [new scriptFunctionParam('ref', 'ObjectID')], {docLink: 'http://geck.bethsoft.com/index.php/GetIsID', name: 'GetIsID'});
	dictionary.fallout3functions['getfactionrank'] = new scriptFunction('int', 'R', 0, [new scriptFunctionParam('ref', 'FactionID')], {docLink: 'http://geck.bethsoft.com/index.php/GetFactionRank', name: 'GetFactionRank'});
	dictionary.fallout3functions['getglobalvalue'] = new scriptFunction('int', 'B', 0, [new scriptFunctionParam('string', 'VarName')], {docLink: 'http://geck.bethsoft.com/index.php/GetGlobalValue', name: 'GetGlobalValue'}, [new scriptFunctionNote(
		function(functionCall) {return true;}, '"GetGlobalValue" is only available in conditions.  Use "VarName" for global variable access in scripts', 1)]); //Depends on target
	dictionary.fallout3functions['issnowing'] = new scriptFunction('bool', 'B', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsSnowing', name: 'IsSnowing'});
	dictionary.fallout3functions['getdisposition'] = new scriptFunction('int', 'R', 0, [new scriptFunctionParam('ref', 'ActorID')], {docLink: 'http://geck.bethsoft.com/index.php/GetDisposition', name: 'GetDisposition'});
	dictionary.fallout3functions['getrandompercent'] = new scriptFunction('int', 'B', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetRandomPercent', name: 'GetRandomPercent'}); //0-99
	dictionary.fallout3functions['streammusic'] = new scriptFunction('void', 'D', 0, [], {name: 'StreamMusic'});
	dictionary.fallout3functions['getquestvariable'] = new scriptFunction('int', 'B', 0, [new scriptFunctionParam('ref', 'ObjectID'), new scriptFunctionParam('string', 'VarName')], {docLink: 'http://geck.bethsoft.com/index.php/GetQuestVariable', name: 'GetQuestVariable'}, [new scriptFunctionNote(
		function(functionCall) {return true;}, '"GetQuestVariable" is only available in conditions.  Use "ObjectID.VarName" for remote variable access in scripts', 1)]); //Depends on target
	dictionary.fallout3functions['getlevel'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetLevel', name: 'GetLevel'}); //1+
	dictionary.fallout3functions['getarmorrating'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetArmorRating', name: 'GetArmorRating'}); //0-100
	dictionary.fallout3functions['removeitem'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'ObjectID'), new scriptFunctionParam('int', 'Count'), new scriptFunctionParam('int', 'HideMessageFlag', true)], {docLink: 'http://geck.bethsoft.com/index.php/RemoveItem', name: 'RemoveItem'});
	dictionary.fallout3functions['moddisposition'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'ActorID'), new scriptFunctionParam('int', 'Value')], {docLink: 'http://geck.bethsoft.com/index.php/ModDisposition', name: 'ModDisposition'});
	dictionary.fallout3functions['getdeadcount'] = new scriptFunction('int', 'B', 0, [new scriptFunctionParam('ref', 'ActorID')], {docLink: 'http://geck.bethsoft.com/index.php/GetDeadCount', name: 'GetDeadCount'}); //0+
	dictionary.fallout3functions['showmap'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('ref', 'MapMarkerID'), new scriptFunctionParam('int', 'EnableFastTravel', true)], {docLink: 'http://geck.bethsoft.com/index.php/ShowMap', name: 'ShowMap'});
	dictionary.fallout3functions['startconversation'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'ActorID'), new scriptFunctionParam('ref', 'TopicID', true), new scriptFunctionParam('ref', 'SpeakerLocation', true), new scriptFunctionParam('ref', 'TargetLocation'), new scriptFunctionParam('int', 'HeadTrackFlag', true), new scriptFunctionParam('int', 'AllowMovementFlag', true)], {docLink: 'http://geck.bethsoft.com/index.php/StartConversation', name: 'StartConversation'}); //Documentation unclear
	dictionary.fallout3functions['drop'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'ObjectID'), new scriptFunctionParam('int', 'Count')], {docLink: 'http://geck.bethsoft.com/index.php/Drop', name: 'Drop'});
	dictionary.fallout3functions['addtopic'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('ref', 'TopicID')], {docLink: 'http://geck.bethsoft.com/index.php/AddTopic', name: 'AddTopic'});
	dictionary.fallout3functions['showmessage'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('ref', 'MessageID'), new scriptFunctionParam('void', 'Var1', true), new scriptFunctionParam('void', 'Var2', true), new scriptFunctionParam('void', 'Var3', true), new scriptFunctionParam('void', 'Var4', true), new scriptFunctionParam('void', 'Var5', true), new scriptFunctionParam('void', 'Var6', true), new scriptFunctionParam('void', 'Var7', true), new scriptFunctionParam('void', 'Var8', true), new scriptFunctionParam('void', 'Var9', true), new scriptFunctionParam('int', 'Duration', true, false, true)], {docLink: 'http://geck.bethsoft.com/index.php/ShowMessage', name: 'ShowMessage'}, [new scriptFunctionNote(
		function(functionCall) {
			for (var i = 2; i in functionCall; i++) {
				if (/^('.*?'|'.*?'|(\d*\.)?\d+)$/.test(functionCall[i]) == true)
					return true;
			}
			return false;
		},
		'"ShowMessage" only accepts variables for parameters "Var1" through "Var9"',
		1)]);
	dictionary.fallout3functions['setalert'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('int', 'Flag')], {docLink: 'http://geck.bethsoft.com/index.php/SetAlert', name: 'SetAlert'});
	dictionary.fallout3functions['getisalerted'] = new scriptFunction('bool', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetIsAlerted', name: 'GetIsAlerted'});
	dictionary.fallout3functions['look'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'TargetID')], {docLink: 'http://geck.bethsoft.com/index.php/Look', name: 'Look'});
	dictionary.fallout3functions['stoplook'] = new scriptFunction('void', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/StopLook', name: 'StopLook'});
	dictionary.fallout3functions['evaluatepackage'] = new scriptFunction('void', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/EvaluatePackage', name: 'EvaluatePackage', shortName: 'EVP', longName: 'EvaluatePackage'});
	dictionary.fallout3functions['evp'] = alias(dictionary.fallout3functions['evaluatepackage']);
	dictionary.fallout3functions['sendassaultalarm'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'VictimID'), new scriptFunctionParam('ref', 'VictimFactionID', true)], {docLink: 'http://geck.bethsoft.com/index.php/SendAssaultAlarm', name: 'SendAssaultAlarm'});
	dictionary.fallout3functions['enableplayercontrols'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('int', 'MovementFlag', true), new scriptFunctionParam('int', 'PipboyFlag', true), new scriptFunctionParam('int', 'FightingFlag', true), new scriptFunctionParam('int', 'POVFlag', true), new scriptFunctionParam('int', 'LookingFlag', true), new scriptFunctionParam('int', 'RolloverTextFlag', true), new scriptFunctionParam('int', 'SneakingFlag', true)], {docLink: 'http://geck.bethsoft.com/index.php/EnablePlayerControls', name: 'EnablePlayerControls'});
	dictionary.fallout3functions['disableplayercontrols'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('int', 'MovementFlag', true), new scriptFunctionParam('int', 'PipboyFlag', true), new scriptFunctionParam('int', 'FightingFlag', true), new scriptFunctionParam('int', 'POVFlag', true), new scriptFunctionParam('int', 'LookingFlag', true), new scriptFunctionParam('int', 'RolloverTextFlag', true), new scriptFunctionParam('int', 'SneakingFlag', true)], {docLink: 'http://geck.bethsoft.com/index.php/DisablePlayerControls', name: 'DisablePlayerControls'});
	dictionary.fallout3functions['getplayercontrolsdisabled'] = new scriptFunction('bool', 'B', 0, [new scriptFunctionParam('int', 'MovementFlag', true), new scriptFunctionParam('int', 'PipboyFlag', true), new scriptFunctionParam('int', 'FightingFlag', true), new scriptFunctionParam('int', 'POVFlag', true), new scriptFunctionParam('int', 'LookingFlag', true), new scriptFunctionParam('int', 'RolloverTextFlag', true), new scriptFunctionParam('int', 'SneakingFlag', true)], {docLink: 'http://geck.bethsoft.com/index.php/GetPlayerControlsDisabled', name: 'GetPlayerControlsDisabled'}); //0, 1
	dictionary.fallout3functions['getheadingangle'] = new scriptFunction('float', 'R', 0, [new scriptFunctionParam('ref', 'ObjectID')], {docLink: 'http://geck.bethsoft.com/index.php/GetHeadingAngle', name: 'GetHeadingAngle'});
	dictionary.fallout3functions['pickidle'] = new scriptFunction('void', 'R', 0, [], {name: 'PickIdle'}); //Undocumented on GECK Wiki
	dictionary.fallout3functions['isweaponout'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsWeaponOut', name: 'IsWeaponOut'}); //0, 1
	dictionary.fallout3functions['istorchout'] = new scriptFunction('void', 'D', 0, [], {name: 'IsTorchOut'});
	dictionary.fallout3functions['isshieldout'] = new scriptFunction('void', 'D', 0, [], {name: 'IsShieldOut'});
	dictionary.fallout3functions['createdetectionevent'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'ActorID'), new scriptFunctionParam('int', 'SoundLevel'), new scriptFunctionParam('int', 'EventType', true)], {docLink: 'http://geck.bethsoft.com/index.php/CreateDetectionEvent', name: 'CreateDetectionEvent'});
	dictionary.fallout3functions['isactionref'] = new scriptFunction('int', 'B', 0, [new scriptFunctionParam('ref', 'RefID')], {docLink: 'http://geck.bethsoft.com/index.php/IsActionRef', name: 'IsActionRef'}, [new scriptFunctionNote(
		function(functionCall) {
			return /'^(onactivate|ontriggerenter|ontriggerleave|ontrigger)$'/.test(script.inBlock.toLowerCase())
		},
		'"IsActionRef" is only useful inside an "OnActivate", "OnTriggerEnter", "OnTriggerLeave", or "OnTrigger" block',
		1)]); //0, 1
	dictionary.fallout3functions['isfacingup'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsFacingUp', name: 'IsFacingUp'}); //0, 1
	dictionary.fallout3functions['getknockedstate'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetKnockedState', name: 'GetKnockedState'}); //0, 1, 2
	dictionary.fallout3functions['getweaponanimtype'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetWeaponAnimType', name: 'GetWeaponAnimType'}); //0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
	dictionary.fallout3functions['isweaponskilltype'] = new scriptFunction('int', '', 0, [], {name: 'IsWeaponSkillType'}); //Undocumented on GECK Wiki //0, 1
	dictionary.fallout3functions['getcurrentaipackage'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetCurrentAIPackage', name: 'GetCurrentAIPackage'}); //0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37
	dictionary.fallout3functions['iswaiting'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsWaiting', name: 'IsWaiting'}); //0, 1
	dictionary.fallout3functions['isidleplaying'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsIdlePlaying', name: 'IsIdlePlaying'}); //0, 1
	dictionary.fallout3functions['completequest'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('ref', 'QuestID')], {docLink: 'http://geck.bethsoft.com/index.php/CompleteQuest', name: 'CompleteQuest'});
	dictionary.fallout3functions['lock'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('int', 'Level', 0)], {docLink: 'http://geck.bethsoft.com/index.php/Lock', name: 'Lock'});
	dictionary.fallout3functions['unlock'] = new scriptFunction('void', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/Unlock', name: 'Unlock'});
	dictionary.fallout3functions['getminorcrimecount'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetMinorCrimeCount', name: 'GetMinorCrimeCount'}); //0+
	dictionary.fallout3functions['getmajorcrimecount'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetMajorCrimeCount', name: 'GetMajorCrimeCount'}); //0+
	dictionary.fallout3functions['getactoraggroradiusviolated'] = new scriptFunction('int', '', 0, [], {name: 'GetActorAggroRadiusViolated'}); //Undocumented on GECK Wiki //0, 1
	dictionary.fallout3functions['getcrimeknown'] = new scriptFunction('int', '', 0, [], {name: 'GetCrimeKnown'}); //Undocumented on GECK Wiki //0, 1
	dictionary.fallout3functions['setenemy'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('ref', 'Faction1'), new scriptFunctionParam('ref', 'Faction2'), new scriptFunctionParam('int', 'F1ToF2Flag'), new scriptFunctionParam('int', 'F1ToF2Flag')], {docLink: 'http://geck.bethsoft.com/index.php/SetEnemy', name: 'SetEnemy'});
	dictionary.fallout3functions['setally'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('ref', 'Faction1'), new scriptFunctionParam('ref', 'Faction2'), new scriptFunctionParam('int', 'F1ToF2Flag'), new scriptFunctionParam('int', 'F1ToF2Flag')], {docLink: 'http://geck.bethsoft.com/index.php/SetAlly', name: 'SetAlly'});
	dictionary.fallout3functions['getcrime'] = new scriptFunction('int', '', 0, [], {name: 'GetCrime'}); //Undocumented on GECK Wiki //0, 1
	dictionary.fallout3functions['isgreetingplayer'] = new scriptFunction('int', '', 0, [], {name: 'IsGreetingPlayer'}); //Undocumented on GECK Wiki //0, 1
	dictionary.fallout3functions['startmistersandman'] = new scriptFunction('void', '', 0, [], {name: 'StartMisterSandman'}); //Undocumented on GECK Wiki
	dictionary.fallout3functions['isguard'] = new scriptFunction('void', 'D', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsGuard', name: 'IsGuard'});
	dictionary.fallout3functions['startcannibal'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'TargetID')], {docLink: 'http://geck.bethsoft.com/index.php/StartCannibal', name: 'StartCannibal'});
	dictionary.fallout3functions['hasbeeneaten'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/HasBeenEaten', name: 'HasBeenEaten'}); //0, 1
	dictionary.fallout3functions['getfatiguepercentage'] = new scriptFunction('float', '', 0, [], {name: 'GetFatiguePercentage'}); //Undocumented on GECK Wiki //0-1
	dictionary.fallout3functions['getfatigue'] = new scriptFunction('float', '', 0, [], {name: 'GetFatigue'}); //Undocumented on GECK Wiki //0+
	dictionary.fallout3functions['getpcisclass'] = new scriptFunction('int', '', 0, [], {name: 'GetPCIsClass'}); //Undocumented on GECK Wiki //0, 1
	dictionary.fallout3functions['getpcisrace'] = new scriptFunction('int', 'B', 0, [new scriptFunctionParam('ref', 'RaceID')], {docLink: 'http://geck.bethsoft.com/index.php/GetPCIsRace', name: 'GetPCIsRace'}); //0, 1
	dictionary.fallout3functions['getpcissex'] = new scriptFunction('int', 'R', 0, [new scriptFunctionParam('string', 'Sex', false, {male: 'Male', female: 'Female'})], {docLink: 'http://geck.bethsoft.com/index.php/GetPCIsSex', name: 'GetPCIsSex'}); //0, 1
	dictionary.fallout3functions['getpcisinfaction'] = new scriptFunction('int', '', 0, [], {name: 'GetPCIsInFaction'}); //Undocumented on GECK Wiki //0, 1
	dictionary.fallout3functions['samefactionaspc'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/SameFactionAsPC', name: 'SameFactionAsPC'}); //0, 1
	dictionary.fallout3functions['sameraceaspc'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/SameRaceAsPC', name: 'SameRaceAsPC'}); //0, 1
	dictionary.fallout3functions['samesexaspc'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/SameSexAsPC', name: 'SameSexAsPC'}); //0, 1
	dictionary.fallout3functions['getisreference'] = new scriptFunction('int', 'R', 0, [new scriptFunctionParam('ref', 'RefID')], {docLink: 'http://geck.bethsoft.com/index.php/GetIsReference', name: 'GetIsReference'}); //0, 1
	dictionary.fallout3functions['setfactionrank'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'FactionID'), new scriptFunctionParam('int', 'NewRank')], {docLink: 'http://geck.bethsoft.com/index.php/SetFactionRank', name: 'SetFactionRank'});
	dictionary.fallout3functions['modfactionrank'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'FactionID'), new scriptFunctionParam('int', 'ModValue')], {docLink: 'http://geck.bethsoft.com/index.php/ModFactionRank', name: 'ModFactionRank'});
	dictionary.fallout3functions['killactor'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'KillerID', true), new scriptFunctionParam('int', 'DismemberLimb', true), new scriptFunctionParam('int', 'CauseOfDeath', true)], {docLink: 'http://geck.bethsoft.com/index.php/KillActor', name: 'KillActor', shortName: 'Kill', longName: 'KillActor'});
	dictionary.fallout3functions['kill'] = alias(dictionary.fallout3functions['killactor']);
	dictionary.fallout3functions['resurrectactor'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('int', 'AnimateFlag', true)], {docLink: 'http://geck.bethsoft.com/index.php/ResurrectActor', name: 'ResurrectActor', shortName: 'Resurrect', longName: 'ResurrectActor'});
	dictionary.fallout3functions['resurrect'] = alias(dictionary.fallout3functions['resurrectactor']);
	dictionary.fallout3functions['istalking'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsTalking', name: 'IsTalking'}); //0, 1
	dictionary.fallout3functions['getwalkspeed'] = new scriptFunction('float', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetWalkSpeed', name: 'GetWalkSpeed', shortName: 'GetWalk', longName: 'GetWalkSpeed'});
	dictionary.fallout3functions['getwalk'] = alias(dictionary.fallout3functions['getwalkspeed']);
	dictionary.fallout3functions['getcurrentaiprocedure'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetCurrentAIProcedure', name: 'GetCurrentAIProcedure'}); //0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50
	dictionary.fallout3functions['gettrespasswarninglevel'] = new scriptFunction('int', 'R', 0, [new scriptFunctionParam('int', 'ActorID')], {docLink: 'http://geck.bethsoft.com/index.php/GetTrespassWarningLevel', name: 'GetTrespassWarningLevel'}); //0+
	dictionary.fallout3functions['istrespassing'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsTrespassing', name: 'IsTrespassing'}); //0, 1
	dictionary.fallout3functions['isinmyownedcell'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsInMyOwnedCell', name: 'IsInMyOwnedCell'}); //0, 1
	dictionary.fallout3functions['getwindspeed'] = new scriptFunction('float', 'B', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetWindSpeed', name: 'GetWindSpeed'}); //0-1
	dictionary.fallout3functions['getcurrentweatherpercent'] = new scriptFunction('float', 'B', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetCurrentWeatherPercent', name: 'GetCurrentWeatherPercent', shortName: 'GetWeatherPct', longName: 'GetCurrentWeatherPercent'}); //0-1
	dictionary.fallout3functions['getweatherpct'] = alias(dictionary.fallout3functions['getcurrentweatherpercent']); //0-1
	dictionary.fallout3functions['getiscurrentweather'] = new scriptFunction('int', 'B', 0, [new scriptFunctionParam('ref', 'WeatherID')], {docLink: 'http://geck.bethsoft.com/index.php/GetIsCurrentWeather', name: 'GetIsCurrentWeather', shortName: 'GetWeather', longName: 'GetIsCurrentWeather'}); //0, 1
	dictionary.fallout3functions['getweather'] = alias(dictionary.fallout3functions['getiscurrentweather']);
	dictionary.fallout3functions['iscontinuingpackagepcnear'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsContinuingPackagePCNear', name: 'IsContinuingPackagePCNear'}); //0, 1
	dictionary.fallout3functions['addscriptpackage'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'PackageID')], {docLink: 'http://geck.bethsoft.com/index.php/AddScriptPackage', name: 'AddScriptPackage'});
	dictionary.fallout3functions['removescriptpackage'] = new scriptFunction('void', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/RemoveScriptPackage', name: 'RemoveScriptPackage'});
	dictionary.fallout3functions['canhaveflames'] = new scriptFunction('int', '', 0, [], {name: 'CanHaveFlames'}); //Undocumented on GECK Wiki //0, 1
	dictionary.fallout3functions['hasflames'] = new scriptFunction('int', '', 0, [], {name: 'HasFlames'}); //Undocumented on GECK Wiki //0, 1
	dictionary.fallout3functions['addflames'] = new scriptFunction('void', '', 0, [], {name: 'AddFlames'}); //Undocumented on GECK Wiki
	dictionary.fallout3functions['removeflames'] = new scriptFunction('void', '', 0, [], {name: 'RemoveFlames'}); //Undocumented on GECK Wiki
	dictionary.fallout3functions['getopenstate'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetOpenState', name: 'GetOpenState'}); //0, 1, 2, 3, 4
	dictionary.fallout3functions['movetomarker'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'MarkerID'), new scriptFunctionParam('float', 'OffsetX', true), new scriptFunctionParam('float', 'OffsetY', true), new scriptFunctionParam('float', 'OffsetZ', true)], {docLink: 'http://geck.bethsoft.com/index.php/MoveToMarker', name: 'MoveToMarker', shortName: 'MoveTo', longName: 'MoveToMarker'});
	dictionary.fallout3functions['moveto'] = alias(dictionary.fallout3functions['movetomarker']);
	dictionary.fallout3functions['getsitting'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetSitting', name: 'GetSitting'}); //0, 1, 2, 3, 4
	dictionary.fallout3functions['getfurnituremarkerid'] = new scriptFunction('int', '', 0, [], {name: 'GetFurnitureMarkerID'}); //Undocumented on GECK Wiki
	dictionary.fallout3functions['getiscurrentpackage'] = new scriptFunction('int', 'R', 0, [new scriptFunctionParam('ref', 'PackageID')], {docLink: 'http://geck.bethsoft.com/index.php/GetIsCurrentPackage', name: 'GetIsCurrentPackage'}); //0, 1
	dictionary.fallout3functions['iscurrentfurnitureref'] = new scriptFunction('int', 'R', 0, [new scriptFunctionParam('ref', 'FurnitureRefID')], {docLink: 'http://geck.bethsoft.com/index.php/IsCurrentFurnitureRef', name: 'IsCurrentFurnitureRef'}); //0, 1
	dictionary.fallout3functions['iscurrentfurnitureobj'] = new scriptFunction('int', 'R', 0, [new scriptFunctionParam('ref', 'FurnitureID')], {docLink: 'http://geck.bethsoft.com/index.php/IsCurrentFurnitureObj', name: 'IsCurrentFurnitureObj'}); //0, 1
	dictionary.fallout3functions['setsize'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('float', 'Size')], {docLink: 'http://geck.bethsoft.com/index.php/SetSize', name: 'SetSize', shortName: 'CSize', longName: 'SetSize'});
	dictionary.fallout3functions['csize'] = alias(dictionary.fallout3functions['setsize']);
	dictionary.fallout3functions['removeme'] = new scriptFunction('void', 'S', 0, [new scriptFunctionParam('ref', 'TargetContainerID', true)], {docLink: 'http://geck.bethsoft.com/index.php/RemoveMe', name: 'RemoveMe'});
	dictionary.fallout3functions['dropme'] = new scriptFunction('void', 'S', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/DropMe', name: 'DropMe'});
	dictionary.fallout3functions['getfactionreaction'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('ref', 'Faction1'), new scriptFunctionParam('ref', 'Faction2')], {docLink: 'http://geck.bethsoft.com/index.php/GetFactionReaction', name: 'GetFactionReaction'});
	dictionary.fallout3functions['setfactionreaction'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('ref', 'Faction1'), new scriptFunctionParam('ref', 'Faction2'), new scriptFunctionParam('float', 'ReactionValue')], {docLink: 'http://geck.bethsoft.com/index.php/SetFactionReaction', name: 'SetFactionReaction'});
	dictionary.fallout3functions['modfactionreaction'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('ref', 'Faction1'), new scriptFunctionParam('ref', 'Faction2'), new scriptFunctionParam('float', 'ModValue')], {docLink: 'http://geck.bethsoft.com/index.php/ModFactionReaction', name: 'ModFactionReaction'});
	dictionary.fallout3functions['getdayofweek'] = new scriptFunction('int', 'B', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetDayOfWeek', name: 'GetDayOfWeek'}); //0, 1, 2, 3, 4, 5, 6
	dictionary.fallout3functions['ignorecrime'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('int', 'Flag')], {docLink: 'http://geck.bethsoft.com/index.php/IgnoreCrime', name: 'IgnoreCrime'});
	dictionary.fallout3functions['gettalkedtopcparam'] = new scriptFunction('int', '', 0, [], {name: 'GetTalkedToPCParam'}); //Undocumented on GECK Wiki //0, 1
	dictionary.fallout3functions['removeallitems'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'TargetContainerID', true), new scriptFunctionParam('int', 'RetainOwnerShipFlag', true)], {docLink: 'http://geck.bethsoft.com/index.php/RemoveAllItems', name: 'RemoveAllItems'});
	dictionary.fallout3functions['wakeuppc'] = new scriptFunction('void', 'B', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/WakeUpPC', name: 'WakeUpPC'});
	dictionary.fallout3functions['ispcsleeping'] = new scriptFunction('int', 'B', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsPCSleeping', name: 'IsPCSleeping'}); //0, 1
	dictionary.fallout3functions['ispcamurderer'] = new scriptFunction('int', 'B', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsPCAMurderer', name: 'IsPCAMurderer'}); //0, 1
	dictionary.fallout3functions['setcombatstyle'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'CombatStyleID')], {docLink: 'http://geck.bethsoft.com/index.php/SetCombatStyle', name: 'SetCombatStyle', shortName: 'SetCS', longName: 'SetCombatStyle'});
	dictionary.fallout3functions['setcs'] = alias(dictionary.fallout3functions['setcombatstyle']);
	dictionary.fallout3functions['playsound3d'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('ref', 'SoundID')], {docLink: 'http://geck.bethsoft.com/index.php/PlaySound3D', name: 'PlaySound3D'});
	dictionary.fallout3functions['selectplayerspell'] = new scriptFunction('void', 'D', 0, [], {name: 'SelectPlayerSpell', shortName: 'SPSpell', longName: 'SelectPlayerSpell'});
	dictionary.fallout3functions['spspell'] = alias(dictionary.fallout3functions['selectplayerspell']);
	dictionary.fallout3functions['getdetectionlevel'] = new scriptFunction('int', 'R', 0, [new scriptFunctionParam('ref', 'ActorID')], {docLink: 'http://geck.bethsoft.com/index.php/GetDetectionLevel', name: 'GetDetectionLevel'}); //0, 1, 2, 3
	dictionary.fallout3functions['isactordetected'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsActorDetected', name: 'IsActorDetected'}, [new scriptFunctionNote(
		function(functionCall) {
			if (0 in functionCall) {
				return functionCall[0].toLowerCase in {player: 1, playerref: 1}
			} else
				return false;
		},
		'"IsActorDetected" will always return 0 when called on the player',
		1)]); //0, 1
	dictionary.fallout3functions['getequipped'] = new scriptFunction('int', 'R', 0, [new scriptFunctionParam('ref', 'ObjectID')], {docLink: 'http://geck.bethsoft.com/index.php/GetEquipped', name: 'GetEquipped'}); //0, 1
	dictionary.fallout3functions['wait'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'PackageID')], {docLink: 'http://geck.bethsoft.com/index.php/Wait', name: 'Wait'});
	dictionary.fallout3functions['stopwaiting'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'PackageID')], {docLink: 'http://geck.bethsoft.com/index.php/StopWaiting', name: 'StopWaiting'});
	dictionary.fallout3functions['isswimming'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsSwimming', name: 'IsSwimming'}); //0, 1
	dictionary.fallout3functions['scripteffectelapsedseconds'] = new scriptFunction('float', 'B', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/ScriptEffectElapsedSeconds', name: 'ScriptEffectElapsedSeconds'}, [new scriptFunctionNote(
		function(functionCall) {return script.inBlock.toLowerCase() != 'scripteffectupdate';}, '"ScriptEffectElapsedSeconds" will only return a value other than 0 inside a "ScriptEffectUpdate" block', 1)]);
	dictionary.fallout3functions['setcellpublicflag'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('ref', 'CellID'), new scriptFunctionParam('int', 'Flag')], {docLink: 'http://geck.bethsoft.com/index.php/SetCellPublicFlag', name: 'SetCellPublicFlag', shortName: 'SetPublic', longName: 'SetCellPublicFlag'});
	dictionary.fallout3functions['setpublic'] = alias(dictionary.fallout3functions['setcellpublicflag']);
	dictionary.fallout3functions['getpcsleephours'] = new scriptFunction('int', 'B', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetPCSleepHours', name: 'GetPCSleepHours'}); //0+
	dictionary.fallout3functions['setpcsleephours'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('int', 'Hours')], {docLink: 'http://geck.bethsoft.com/index.php/SetPCSleepHours', name: 'SetPCSleepHours'});
	dictionary.fallout3functions['getamountsoldstolen'] = new scriptFunction('void', 'D', 0, [], {name: 'GetAmountSoldStolen'});
	dictionary.fallout3functions['modamountsoldstolen'] = new scriptFunction('void', 'D', 0, [], {name: 'ModAmountSoldStolen'});
	dictionary.fallout3functions['getignorecrime'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetIgnoreCrime', name: 'GetIgnoreCrime'}); //0, 1
	dictionary.fallout3functions['getpcexpelled'] = new scriptFunction('int', 'D', 0, [], {name: 'GetPCExpelled'}); //0, 1
	dictionary.fallout3functions['setpcexpelled'] = new scriptFunction('void', 'D', 0, [], {name: 'SetPCExpelled'});
	dictionary.fallout3functions['getpcfactionmurder'] = new scriptFunction('int', '', 0, [], {name: 'GetPCFactionMurder'}); //Undocumented on GECK Wiki //0, 1
	dictionary.fallout3functions['setpcfactionmurder'] = new scriptFunction('void', '', 0, [], {name: 'SetPCFactionMurder'}); //Undocumented on GECK Wiki
	dictionary.fallout3functions['getpcenemyoffaction'] = new scriptFunction('int', '', 0, [], {name: 'GetPCEnemyOfFaction'}); //Undocumented on GECK Wiki //0, 1
	dictionary.fallout3functions['setpcenemyoffaction'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('ref', 'FactionID'), new scriptFunctionParam('in', 'Flag')], {docLink: 'http://geck.bethsoft.com/index.php/SetPCEnemyOfFaction', name: 'SetPCEnemyOfFaction'});
	dictionary.fallout3functions['getpcfactionattack'] = new scriptFunction('int', '', 0, [], {name: 'GetPCFactionAttack'}); //Undocumented on GECK Wiki //0, 1
	dictionary.fallout3functions['setpcfactionattack'] = new scriptFunction('void', '', 0, [], {name: 'SetPCFactionAttack'}); //Undocumented on GECK Wiki
	dictionary.fallout3functions['unusedfunction21'] = new scriptFunction('void', 'D', 0, [], {name: 'UnusedFunction21'});
	dictionary.fallout3functions['unusedfunction22'] = new scriptFunction('void', 'D', 0, [], {name: 'UnusedFunction22'});
	dictionary.fallout3functions['getdestroyed'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetDestroyed', name: 'GetDestroyed'}); //0, 1
	dictionary.fallout3functions['setdestroyed'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('int', 'Flag')], {docLink: 'http://geck.bethsoft.com/index.php/SetDestroyed', name: 'SetDestroyed'});
	dictionary.fallout3functions['getactionref'] = new scriptFunction('ref', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetActionRef', name: 'GetActionRef', shortName: 'GetAR', longName: 'GetActionRef'}, [new scriptFunctionNote(
		function(functionCall) {
			return /'^(onactivate|ontriggerenter|ontriggerleave|ontrigger)$'/.test(script.inBlock.toLowerCase())
		},
		'GetActionRef is only useful inside an "OnActivate", "OnTriggerEnter", "OnTriggerLeave", or "OnTrigger" block',
		1)]);
	dictionary.fallout3functions['getar'] = alias(dictionary.fallout3functions['getactionref']);
	dictionary.fallout3functions['getself'] = new scriptFunction('ref', 'S', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetSelf', name: 'GetSelf', shortName: 'This', longName: 'GetSelf'}, [new scriptFunctionNote(
		function(functionCall) {return true;},
		'When called on references created dynamically (for example, via PlaceAtMe), GetSelf will always return 0',
		0)]);
	dictionary.fallout3functions['this'] = alias(dictionary.fallout3functions['getself']);
	dictionary.fallout3functions['getcontainer'] = new scriptFunction('ref', 'S', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetContainer', name: 'GetContainer'});
	dictionary.fallout3functions['getforcerun'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetForceRun', name: 'GetForceRun'}); //0, 1
	dictionary.fallout3functions['setforcerun'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('int', 'Flag')], {docLink: 'http://geck.bethsoft.com/index.php/SetForceRun', name: 'SetForceRun'});
	dictionary.fallout3functions['getforcesneak'] = new scriptFunction('int', 'R', 0, [], {name: 'GetForceSneak'}); //Undocumented on GECK Wiki //0, 1
	dictionary.fallout3functions['setforcesneak'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('int', 'Flag')], {docLink: 'http://geck.bethsoft.com/index.php/SetForceSneak', name: 'SetForceSneak'});
	dictionary.fallout3functions['advancepcskill'] = new scriptFunction('void');
	dictionary.fallout3functions['advskill'] = alias(dictionary.fallout3functions['advancepcskill']); //Undocumented on GECK Wiki
	dictionary.fallout3functions['advancepclevel'] = new scriptFunction('void');
	dictionary.fallout3functions['advlevel'] = alias(dictionary.fallout3functions['advancepclevel']);
	dictionary.fallout3functions['hasmagiceffect'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getdefaultopen'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['setdefaultopen'] = new scriptFunction('void');
	dictionary.fallout3functions['showclassmenu'] = new scriptFunction('void');
	dictionary.fallout3functions['showracemenu'] = new scriptFunction('void');
	dictionary.fallout3functions['getanimaction'] = new scriptFunction('int'); //0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13
	dictionary.fallout3functions['shownamemenu'] = new scriptFunction('void');
	dictionary.fallout3functions['setopenstate'] = new scriptFunction('void');
	dictionary.fallout3functions['unusedfunction26'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['isspelltarget'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getvatsmode'] = new scriptFunction('int'); //0, 1, 2, 3, 4
	dictionary.fallout3functions['getpersuasionnumber'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['getsandman'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getcannibal'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getisclassdefault'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getclassdefaultmatch'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getincellparam'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['setinchargen'] = new scriptFunction('void');
	dictionary.fallout3functions['getcombattarget'] = new scriptFunction('ref');
	dictionary.fallout3functions['getpackagetarget'] = new scriptFunction('ref');
	dictionary.fallout3functions['showspellmaking'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['getvatstargetheight'] = new scriptFunction('float');
	dictionary.fallout3functions['setghost'] = new scriptFunction('void');
	dictionary.fallout3functions['getisghost'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['equipitem'] = new scriptFunction('void');
	dictionary.fallout3functions['equipobject'] = alias(dictionary.fallout3functions['equipitem']);
	dictionary.fallout3functions['unequipitem'] = new scriptFunction('void');
	dictionary.fallout3functions['unequipobject'] = alias(dictionary.fallout3functions['unequipitem']);
	dictionary.fallout3functions['setclass'] = new scriptFunction('void');
	dictionary.fallout3functions['setunconscious'] = new scriptFunction('void');
	dictionary.fallout3functions['getunconscious'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['setrestrained'] = new scriptFunction('void');
	dictionary.fallout3functions['getrestrained'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['forceflee'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['flee'] = alias(dictionary.fallout3functions['forceflee']);
	dictionary.fallout3functions['getisuseditem'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getisuseditemtype'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['unusedfunction9'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['unusedfunction10'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['unusedfunction11'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['unusedfunction12'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['unusedfunction13'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['unusedfunction14'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['getisplayablerace'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getoffersservicesnow'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getgamesetting'] = new scriptFunction('depends'); //Depends on target
	dictionary.fallout3functions['getgs'] = alias(dictionary.fallout3functions['getgamesetting']); //Depends on target
	dictionary.fallout3functions['stopcombatalarmonactor'] = new scriptFunction('void');
	dictionary.fallout3functions['scaonactor'] = alias(dictionary.fallout3functions['stopcombatalarmonactor']);
	dictionary.fallout3functions['getuseditemlevel'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getuseditemactivate'] = new scriptFunction('unknown');
	dictionary.fallout3functions['setweather'] = new scriptFunction('void');
	dictionary.fallout3functions['sw'] = alias(dictionary.fallout3functions['setweather']);
	dictionary.fallout3functions['forcetakecover'] = new scriptFunction('void');
	dictionary.fallout3functions['takecover'] = alias(dictionary.fallout3functions['forcetakecover']);
	dictionary.fallout3functions['modbartergold'] = new scriptFunction('void');
	dictionary.fallout3functions['setbartergold'] = new scriptFunction('void');
	dictionary.fallout3functions['getbartergold'] = new scriptFunction('int'); //0+
	dictionary.fallout3functions['istimepassing'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['ispleasant'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['iscloudy'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['trapupdate'] = new scriptFunction('void');
	dictionary.fallout3functions['setquestobject'] = new scriptFunction('void');
	dictionary.fallout3functions['forceactorvalue'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('string', 'StatName', false, dictionary.values.actorValues), new scriptFunctionParam('float', 'Value')], {docLink: 'http://geck.bethsoft.com/index.php/ForceActorValue', name: 'ForceActorValue', shortName: 'ForceAV', longName: 'ForceActorValue'});
	dictionary.fallout3functions['forceav'] = alias(dictionary.fallout3functions['forceactorvalue']);
	dictionary.fallout3functions['modpcskill'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('string', 'StatName', false, dictionary.values.skills), new scriptFunctionParam('float', 'Value')], {docLink: 'http://geck.bethsoft.com/index.php/ModPCSkill', name: 'ModPCSkill', shortName: 'ModPCS', longName: 'ModPCSkill'});
	dictionary.fallout3functions['modpcs'] = alias(dictionary.fallout3functions['modpcskill']);
	dictionary.fallout3functions['modpcattribute'] = new scriptFunction('void', 'B', 0, [new scriptFunctionParam('string', 'StatName', false, dictionary.values.attributes), new scriptFunctionParam('float', 'Value')], {docLink: 'http://geck.bethsoft.com/index.php/ModPCAttribute', name: 'ModPCAttribute', shortName: 'ModPCA', longName: 'ModPCAttribute'});
	dictionary.fallout3functions['modpca'] = alias(dictionary.fallout3functions['modpcattribute']);
	dictionary.fallout3functions['enablefasttravel'] = new scriptFunction('void');
	dictionary.fallout3functions['enablefast'] = alias(dictionary.fallout3functions['enablefasttravel']);
	dictionary.fallout3functions['getarmorratingupperbody'] = new scriptFunction('int'); //0-100
	dictionary.fallout3functions['getparentref'] = new scriptFunction('ref');
	dictionary.fallout3functions['playbink'] = new scriptFunction('void');
	dictionary.fallout3functions['getbaseactorvalue'] = new scriptFunction('int'); //0-100
	dictionary.fallout3functions['getbaseav'] = alias(dictionary.fallout3functions['getbaseactorvalue']) //0-100
	dictionary.fallout3functions['isowner'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['setownership'] = new scriptFunction('void');
	dictionary.fallout3functions['iscellowner'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['setcellownership'] = new scriptFunction('void');
	dictionary.fallout3functions['ishorsestolen'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['setcellfullname'] = new scriptFunction('void');
	dictionary.fallout3functions['setactorfullname'] = new scriptFunction('void');
	dictionary.fallout3functions['isleftup'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['issneaking'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['isrunning'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getfriendhit'] = new scriptFunction('int'); //0+
	dictionary.fallout3functions['isincombat'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['setpackduration'] = new scriptFunction('void');
	dictionary.fallout3functions['spdur'] = alias(dictionary.fallout3functions['setpackduration']);
	dictionary.fallout3functions['playmagicshadervisuals'] = new scriptFunction('void');
	dictionary.fallout3functions['pms'] = alias(dictionary.fallout3functions['playmagicshadervisuals']);
	dictionary.fallout3functions['playmagiceffectvisuals'] = new scriptFunction('void');
	dictionary.fallout3functions['pme'] = alias(dictionary.fallout3functions['playmagiceffectvisuals']);
	dictionary.fallout3functions['stopmagicshadervisuals'] = new scriptFunction('void');
	dictionary.fallout3functions['sms'] = alias(dictionary.fallout3functions['stopmagicshadervisuals']);
	dictionary.fallout3functions['stopmagiceffectvisuals'] = new scriptFunction('void');
	dictionary.fallout3functions['sme'] = alias(dictionary.fallout3functions['stopmagiceffectvisuals']);
	dictionary.fallout3functions['resetinterior'] = new scriptFunction('void');
	dictionary.fallout3functions['isanimplaying'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['setactoralpha'] = new scriptFunction('void');
	dictionary.fallout3functions['saa'] =dictionary.fallout3functions['setactoralpha'];
	dictionary.fallout3functions['enablelinkedpathpoints'] = new scriptFunction('void');
	dictionary.fallout3functions['disablelinkedpathpoints'] = new scriptFunction('void');
	dictionary.fallout3functions['isininterior'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['forceweather'] = new scriptFunction('void');
	dictionary.fallout3functions['fw'] = alias(dictionary.fallout3functions['forceweather']);
	dictionary.fallout3functions['toggleactorsai'] = new scriptFunction('void');
	dictionary.fallout3functions['isactorsaioff'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['iswaterobject'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['unusedfunction15'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['isactorusingatorch'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['setlevel'] = new scriptFunction('void');
	dictionary.fallout3functions['resetfalldamagetimer'] = new scriptFunction('void');
	dictionary.fallout3functions['isxbox'] = new scriptFunction('int', 'B', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsXBox', name: 'IsXBox'}, [new scriptFunctionNote(
		function(functionCall) {return true;},
		'"IsXBox" will always return 0',
		1)]); //0
	dictionary.fallout3functions['getinworldspace'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['modpcmiscstat'] = new scriptFunction('void');
	dictionary.fallout3functions['modpcms'] = alias(dictionary.fallout3functions['modpcmiscstat']);
	dictionary.fallout3functions['getpcmiscstat'] = new scriptFunction('int'); //0+
	dictionary.fallout3functions['getpcms'] = alias(dictionary.fallout3functions['getpcmiscstat']); //0+
	dictionary.fallout3functions['isactorevil'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['isactoravictim'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['gettotalpersuasionnumber'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['setscale'] = new scriptFunction('void');
	dictionary.fallout3functions['modscale'] = new scriptFunction('void');
	dictionary.fallout3functions['getidledoneonce'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['killallactors'] = new scriptFunction('void');
	dictionary.fallout3functions['killall'] = alias(dictionary.fallout3functions['killallactors']);
	dictionary.fallout3functions['getnorumors'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['setnorumors'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['dispel'] = new scriptFunction('void');
	dictionary.fallout3functions['whichservicemenu'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['triggerhitshader'] = new scriptFunction('void');
	dictionary.fallout3functions['ths'] = alias(dictionary.fallout3functions['triggerhitshader']);
	dictionary.fallout3functions['unusedfunction16'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['reset3dstate'] = new scriptFunction('void');
	dictionary.fallout3functions['isridinghorse'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['dispelallspells'] = new scriptFunction('void');
	dictionary.fallout3functions['unusedfunction17'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['addachievement'] = new scriptFunction('void');
	dictionary.fallout3functions['duplicateallitems'] = new scriptFunction('void');
	dictionary.fallout3functions['isindangerouswater'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['essentialdeathreload'] = new scriptFunction('void');
	dictionary.fallout3functions['setshowquestitems'] = new scriptFunction('void');
	dictionary.fallout3functions['duplicatenpcstats'] = new scriptFunction('void');
	dictionary.fallout3functions['resethealth'] = new scriptFunction('void');
	dictionary.fallout3functions['setignorefriendlyhits'] = new scriptFunction('void');
	dictionary.fallout3functions['sifh'] = alias(dictionary.fallout3functions['setignorefriendlyhits']);
	dictionary.fallout3functions['getignorefriendlyhits'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['gifh'] = alias(dictionary.fallout3functions['getignorefriendlyhits']); //0, 1
	dictionary.fallout3functions['isplayerslastriddenhorse'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['setactorrefraction'] = new scriptFunction('void');
	dictionary.fallout3functions['sar'] = alias(dictionary.fallout3functions['setactorrefraction']);
	dictionary.fallout3functions['setitemvalue'] = new scriptFunction('void');
	dictionary.fallout3functions['setrigidbodymass'] = new scriptFunction('void');
	dictionary.fallout3functions['showviewerstrings'] = new scriptFunction('void');
	dictionary.fallout3functions['svs'] = alias(dictionary.fallout3functions['showviewerstrings']);
	dictionary.fallout3functions['releaseweatheroverride'] = new scriptFunction('void');
	dictionary.fallout3functions['rwo'] = alias(dictionary.fallout3functions['releaseweatheroverride']);
	dictionary.fallout3functions['setallreachable'] = new scriptFunction('void');
	dictionary.fallout3functions['setallvisible'] = new scriptFunction('void');
	dictionary.fallout3functions['setnoavoidance'] = new scriptFunction('void');
	dictionary.fallout3functions['sendtrespassalarm'] = new scriptFunction('void');
	dictionary.fallout3functions['setsceneiscomplex'] = new scriptFunction('void');
	dictionary.fallout3functions['autosave'] = new scriptFunction('void');
	dictionary.fallout3functions['startmasterfileseekdata'] = new scriptFunction('void');
	dictionary.fallout3functions['dumpmasterfileseekdata'] = new scriptFunction('void');
	dictionary.fallout3functions['isactor'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['isessential'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['preloadmagiceffect'] = new scriptFunction('void');
	dictionary.fallout3functions['showdialogsubtitles'] = new scriptFunction('void');
	dictionary.fallout3functions['unusedfunction27'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['isplayermovingintonewspace'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['unusedfunction28'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['unusedfunction29'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['gettimedead'] = new scriptFunction('float'); //0+
	dictionary.fallout3functions['getplayerhaslastriddenhorse'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['getlinkedref'] = new scriptFunction('ref');
	dictionary.fallout3functions['damageobject'] = new scriptFunction('void');
	dictionary.fallout3functions['do'] = alias(dictionary.fallout3functions['damageobject']);
	dictionary.fallout3functions['ischild'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['unusedfunction1'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['getlastplayeraction'] = new scriptFunction('int'); //1, 2, 3, 4, 5, 6, 7, 8, 9, 10
	dictionary.fallout3functions['isplayeractionactive'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['settalkingactivatoractor'] = new scriptFunction('void');
	dictionary.fallout3functions['istalkingactivatoractor'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['showbartermenu'] = new scriptFunction('void');
	dictionary.fallout3functions['sbm'] = alias(dictionary.fallout3functions['showbartermenu']);
	dictionary.fallout3functions['isinlist'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['unusedfunction18'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['addperk'] = new scriptFunction('void');
	dictionary.fallout3functions['rewardxp'] = new scriptFunction('void');
	dictionary.fallout3functions['showhackingminigame'] = new scriptFunction('void');
	dictionary.fallout3functions['shmg'] = alias(dictionary.fallout3functions['showhackingminigame']);
	dictionary.fallout3functions['showsurgerymenu'] = new scriptFunction('void');
	dictionary.fallout3functions['ssmg'] = alias(dictionary.fallout3functions['showsurgerymenu']);
	dictionary.fallout3functions['showrepairmenu'] = new scriptFunction('void');
	dictionary.fallout3functions['srm'] = alias(dictionary.fallout3functions['showrepairmenu']);
	dictionary.fallout3functions['functionunused19'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['unused'] = alias(dictionary.fallout3functions['functionunused19']);
	dictionary.fallout3functions['addnote'] = new scriptFunction('void');
	dictionary.fallout3functions['an'] = alias(dictionary.fallout3functions['addnote']);
	dictionary.fallout3functions['removenote'] = new scriptFunction('void');
	dictionary.fallout3functions['rn'] = alias(dictionary.fallout3functions['removenote']);
	dictionary.fallout3functions['gethasnote'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getn'] = alias(dictionary.fallout3functions['gethasnote']); //0, 1
	dictionary.fallout3functions['addtofaction'] = new scriptFunction('void');
	dictionary.fallout3functions['addfac'] = alias(dictionary.fallout3functions['addtofaction']);
	dictionary.fallout3functions['removefromfaction'] = new scriptFunction('void');
	dictionary.fallout3functions['removefac'] = alias(dictionary.fallout3functions['removefromfaction']);
	dictionary.fallout3functions['damageactorvalue'] = new scriptFunction('void');
	dictionary.fallout3functions['damageav'] = alias(dictionary.fallout3functions['damageactorvalue']);
	dictionary.fallout3functions['restoreactorvalue'] = new scriptFunction('void');
	dictionary.fallout3functions['restoreav'] = alias(dictionary.fallout3functions['restoreactorvalue']);
	dictionary.fallout3functions['triggerhudshudder'] = new scriptFunction('void');
	dictionary.fallout3functions['hudsh'] = alias(dictionary.fallout3functions['triggerhudshudder']);
	dictionary.fallout3functions['setdisposition'] = new scriptFunction('void');
	dictionary.fallout3functions['setdisp'] = alias(dictionary.fallout3functions['setdisposition']);
	dictionary.fallout3functions['showcomputersinterface'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['sci'] = alias(dictionary.fallout3functions['showcomputersinterface']);
	dictionary.fallout3functions['setglobaltimemultiplier'] = new scriptFunction('void');
	dictionary.fallout3functions['sgtm'] = alias(dictionary.fallout3functions['setglobaltimemultiplier']);
	dictionary.fallout3functions['gethitlocation'] = new scriptFunction('int'); //0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14
	dictionary.fallout3functions['ispc1stperson'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['pc1st'] = alias(dictionary.fallout3functions['ispc1stperson']); //0, 1
	dictionary.fallout3functions['purgecellbuffers'] = new scriptFunction('void');
	dictionary.fallout3functions['pcb'] = alias(dictionary.fallout3functions['purgecellbuffers']);
	dictionary.fallout3functions['pushactoraway'] = new scriptFunction('void');
	dictionary.fallout3functions['setactorsai'] = new scriptFunction('void');
	dictionary.fallout3functions['clearownership'] = new scriptFunction('void');
	dictionary.fallout3functions['getcauseofdeath'] = new scriptFunction('int'); //-1, 0, 2, 3, 4, 5, 6, 7
	dictionary.fallout3functions['islimbgone'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['isweaponinlist'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['playidle'] = new scriptFunction('void');
	dictionary.fallout3functions['applyimagespacemodifier'] = new scriptFunction('void');
	dictionary.fallout3functions['imod'] = alias(dictionary.fallout3functions['applyimagespacemodifier']);
	dictionary.fallout3functions['removeimagespacemodifier'] = new scriptFunction('void');
	dictionary.fallout3functions['rimod'] = alias(dictionary.fallout3functions['removeimagespacemodifier']);
	dictionary.fallout3functions['hasfrienddisposition'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['functionunused20'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['frienddispositionboost'] = new scriptFunction('void');
	dictionary.fallout3functions['setcellimagespace'] = new scriptFunction('void');
	dictionary.fallout3functions['showchargenmenu'] = new scriptFunction('void');
	dictionary.fallout3functions['scgm'] = alias(dictionary.fallout3functions['showchargenmenu']);
	dictionary.fallout3functions['getvatsvalue'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['iskiller'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['iskillerobject'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getfactioncombatreaction'] = new scriptFunction('unknown');
	dictionary.fallout3functions['useweapon'] = new scriptFunction('void');
	dictionary.fallout3functions['evaluatespellconditions'] = new scriptFunction('void');
	dictionary.fallout3functions['esc'] = alias(dictionary.fallout3functions['evaluatespellconditions']);
	dictionary.fallout3functions['togglemotionblur'] = new scriptFunction('void');
	dictionary.fallout3functions['tmb'] = alias(dictionary.fallout3functions['togglemotionblur']);
	dictionary.fallout3functions['exists'] = new scriptFunction('int', 'R', 0, [new scriptFunctionParam('ref', 'Target', 0)], {docLink: 'http://geck.bethsoft.com/index.php/Exists', name: 'Exists'}, [new scriptFunctionNote(
		function(functionCall) {return true;},
		'"Exists" is a condition function only.  Use "GetIsReference" to compare two references',
		1)]); //0, 1
	dictionary.fallout3functions['getgroupmembercount'] = new scriptFunction('int'); //0+
	dictionary.fallout3functions['getgrouptargetcount'] = new scriptFunction('int'); //0+
	dictionary.fallout3functions['setobjectivecompleted'] = new scriptFunction('void');
	dictionary.fallout3functions['setobjectivedisplayed'] = new scriptFunction('void');
	dictionary.fallout3functions['getobjectivecompleted'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getobjectivedisplayed'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['setimagespace'] = new scriptFunction('void');
	dictionary.fallout3functions['pipboyradio'] = new scriptFunction('void');
	dictionary.fallout3functions['prad'] = alias(dictionary.fallout3functions['pipboyradio']);
	dictionary.fallout3functions['removeperk'] = new scriptFunction('void');
	dictionary.fallout3functions['disableallactors'] = new scriptFunction('void');
	dictionary.fallout3functions['disaa'] = alias(dictionary.fallout3functions['disableallactors']);
	dictionary.fallout3functions['getisformtype'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getisvoicetype'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getplantedexplosive'] = new scriptFunction('unknown');
	dictionary.fallout3functions['completeallobjectives'] = new scriptFunction('void');
	dictionary.fallout3functions['isactortalkingthroughactivator'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['gethealthpercentage'] = new scriptFunction('float'); //0-1
	dictionary.fallout3functions['setaudiomultithreading'] = new scriptFunction('void');
	dictionary.fallout3functions['sam'] = alias(dictionary.fallout3functions['setaudiomultithreading']);
	dictionary.fallout3functions['getisobjecttype'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['showchargenmenuparams'] = new scriptFunction('void');
	dictionary.fallout3functions['scgmp'] = alias(dictionary.fallout3functions['showchargenmenuparams']);
	dictionary.fallout3functions['getdialogueemotion'] = new scriptFunction('unknown');
	dictionary.fallout3functions['getdialogueemotionvalue'] = new scriptFunction('unknown');
	dictionary.fallout3functions['exitgame'] = new scriptFunction('void');
	dictionary.fallout3functions['exit'] = alias(dictionary.fallout3functions['exitgame']);
	dictionary.fallout3functions['getiscreaturetype'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['setmerchantcontainer'] = new scriptFunction('void');
	dictionary.fallout3functions['removemerchantcontainer'] = new scriptFunction('void');
	dictionary.fallout3functions['showwarning'] = new scriptFunction('void', 'D', 0, [new scriptFunctionParam('ref', 'Message', 0)], {docLink: 'http://geck.bethsoft.com/index.php/ShowWarning', name: 'ShowWarning'});
	dictionary.fallout3functions['entertrigger'] = new scriptFunction('void');
	dictionary.fallout3functions['markfordelete'] = new scriptFunction('void');
	dictionary.fallout3functions['additemhealthpercent'] = new scriptFunction('void');
	dictionary.fallout3functions['placeatmehealthpercent'] = new scriptFunction('ref');
	dictionary.fallout3functions['getinzone'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['disablenavmesh'] = new scriptFunction('void');
	dictionary.fallout3functions['enablenavmesh'] = new scriptFunction('void');
	dictionary.fallout3functions['hasperk'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getfactionrelation'] = new scriptFunction('int'); //0, 1, 2, 3
	dictionary.fallout3functions['islastidleplayed'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['setnpcradio'] = new scriptFunction('void');
	dictionary.fallout3functions['snr'] = alias(dictionary.fallout3functions['setnpcradio']);
	dictionary.fallout3functions['setplayerteammate'] = new scriptFunction('void');
	dictionary.fallout3functions['getplayerteammate'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getplayerteammatecount'] = new scriptFunction('int'); //0+
	dictionary.fallout3functions['openteammatecontainer'] = new scriptFunction('void');
	dictionary.fallout3functions['clearfactionplayerenemyflag'] = new scriptFunction('void');
	dictionary.fallout3functions['getactorcrimeplayerenemy'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getactorfactionplayerenemy'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['setplayertagskill'] = new scriptFunction('void');
	dictionary.fallout3functions['isplayertagskill'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getplayergrabbedref'] = new scriptFunction('ref');
	dictionary.fallout3functions['isplayergrabbedref'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['placeleveledactoratme'] = new scriptFunction('ref');
	dictionary.fallout3functions['unusedfunction'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['showlockpickmenu'] = new scriptFunction('void');
	dictionary.fallout3functions['slpm'] = alias(dictionary.fallout3functions['showlockpickmenu']);
	dictionary.fallout3functions['getbroadcaststate'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['setbroadcaststate'] = new scriptFunction('void');
	dictionary.fallout3functions['startradioconversation'] = new scriptFunction('void');
	dictionary.fallout3functions['getdestructionstage'] = new scriptFunction('int'); //0+
	dictionary.fallout3functions['cleardestruction'] = new scriptFunction('void');
	dictionary.fallout3functions['castimmediateonself'] = new scriptFunction('void', 'R', 0, [new scriptFunctionParam('ref', 'Spell')], {docLink: 'http://geck.bethsoft.com/index.php/CastImmediateOnSelf', name: 'CastImmediateOnSelf', shortName: 'CIOS', longName: 'CastImmediateOnSelf'});
	dictionary.fallout3functions['cios'] = alias(dictionary.fallout3functions['castimmediateonself']);
	dictionary.fallout3functions['getisalignment'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['resetquest'] = new scriptFunction('void');
	dictionary.fallout3functions['setquestdelay'] = new scriptFunction('void');
	dictionary.fallout3functions['forceactivequest'] = new scriptFunction('void');
	dictionary.fallout3functions['getthreatratio'] = new scriptFunction('unknown');
	dictionary.fallout3functions['matchfacegeometry'] = new scriptFunction('void');
	dictionary.fallout3functions['getisuseditemequiptype'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getplayername'] = new scriptFunction('void');
	dictionary.fallout3functions['fireweapon'] = new scriptFunction('void');
	dictionary.fallout3functions['showtutorialmenu'] = new scriptFunction('void');
	dictionary.fallout3functions['agerace'] = new scriptFunction('void');
	dictionary.fallout3functions['matchrace'] = new scriptFunction('void');
	dictionary.fallout3functions['setpcyoung'] = new scriptFunction('void');
	dictionary.fallout3functions['sexchange'] = new scriptFunction('void');
	dictionary.fallout3functions['showspecialbookmenu'] = new scriptFunction('void');
	dictionary.fallout3functions['ssbm'] = alias(dictionary.fallout3functions['showspecialbookmenu']);
	dictionary.fallout3functions['getconcussed'] = new scriptFunction('unknown');
	dictionary.fallout3functions['setzonerespawns'] = new scriptFunction('void');
	dictionary.fallout3functions['setvatstarget'] = new scriptFunction('void');
	dictionary.fallout3functions['getmapmarkervisible'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['resetinventory'] = new scriptFunction('void');
	dictionary.fallout3functions['showspecialbookmenuparams'] = new scriptFunction('void');
	dictionary.fallout3functions['ssbmp'] = alias(dictionary.fallout3functions['showspecialbookmenuparams']);
	dictionary.fallout3functions['getpermanentactorvalue'] = new scriptFunction('float', 'R', 0, [new scriptFunctionParam('string', 'StatName', false, dictionary.values.actorValues)], {docLink: 'http://geck.bethsoft.com/index.php/GetPermanentActorValue', name: 'GetPermanentActorValue', shortName: 'GetPermAV', longName: 'GetPermanentActorValue'});
	dictionary.fallout3functions['getpermav'] = alias(dictionary.fallout3functions['getpermanentactorvalue']);
	dictionary.fallout3functions['getkillingblowlimb'] = new scriptFunction('int', 'R', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/GetKillingBlowLimb', name: 'GetKillingBlowLimb'}); //0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
	dictionary.fallout3functions['showbarbermenu'] = new scriptFunction('void');
	dictionary.fallout3functions['showplasticsurgeonmenu'] = new scriptFunction('void');
	dictionary.fallout3functions['triggerlodapocalypse'] = new scriptFunction('void');
	dictionary.fallout3functions['getweaponhealthperc'] = new scriptFunction('int'); //0-100, may be float
	dictionary.fallout3functions['setweaponhealthperc'] = new scriptFunction('void');
	dictionary.fallout3functions['modweaponhealthperc'] = new scriptFunction('void');
	dictionary.fallout3functions['getradiationlevel'] = new scriptFunction('int'); //0+
	dictionary.fallout3functions['showallmapmarkers'] = new scriptFunction('void');
	dictionary.fallout3functions['tmm'] = alias(dictionary.fallout3functions['showallmapmarkers']);
	dictionary.fallout3functions['showchargenmenumodvalues'] = new scriptFunction('void');
	dictionary.fallout3functions['scgmod'] = alias(dictionary.fallout3functions['showchargenmenumodvalues']);
	dictionary.fallout3functions['resetai'] = new scriptFunction('void');
	dictionary.fallout3functions['setrumble'] = new scriptFunction('void');
	dictionary.fallout3functions['setnoactivationsound'] = new scriptFunction('void');
	dictionary.fallout3functions['clearnoactivationsound'] = new scriptFunction('void');
	dictionary.fallout3functions['getlasthitcritical'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['playmusic'] = new scriptFunction('void');
	dictionary.fallout3functions['setlocationspecificloadscreensonly'] = new scriptFunction('void');
	dictionary.fallout3functions['resetpipboymanager'] = new scriptFunction('void');
	dictionary.fallout3functions['setpctoddler'] = new scriptFunction('void');
	dictionary.fallout3functions['iscombattarget'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['rewardkarma'] = new scriptFunction('void');
	dictionary.fallout3functions['triggerscreenblood'] = new scriptFunction('void');
	dictionary.fallout3functions['tsb'] = alias(dictionary.fallout3functions['triggerscreenblood']);
	dictionary.fallout3functions['getvatsrightareafree'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getvatsleftareafree'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getvatsbackareafree'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getvatsfrontareafree'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getislockbroken'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['isps3'] = new scriptFunction('int', 'B', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsPS3', name: 'IsPS3'}, [new scriptFunctionNote(
		function(functionCall) {return true;},
		'"IsPS3" will always return 0',
		1)]); //0
	dictionary.fallout3functions['iswin32'] = new scriptFunction('int', 'B', 0, [], {docLink: 'http://geck.bethsoft.com/index.php/IsWin32', name: 'IsWin32'}, [new scriptFunctionNote(
		function(functionCall) {return true;},
		'"IsWin32" will always return 1',
		1)]); //0
	dictionary.fallout3functions['getvatsrighttargetvisible'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getvatslefttargetvisible'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getvatsbacktargetvisible'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getvatsfronttargetvisible'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['attachashpile'] = new scriptFunction('void');
	dictionary.fallout3functions['setcriticalstage'] = new scriptFunction('void');
	dictionary.fallout3functions['isincriticalstage'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['removefromallfactions'] = new scriptFunction('void');
	dictionary.fallout3functions['getxpfornextlevel'] = new scriptFunction('void');
	dictionary.fallout3functions['showlockpickmenudebug'] = new scriptFunction('void');
	dictionary.fallout3functions['slpmb'] = alias(dictionary.fallout3functions['showlockpickmenudebug']);
	dictionary.fallout3functions['forcesave'] = new scriptFunction('void');
	dictionary.fallout3functions['setspecialpoints'] = new scriptFunction('void');
	dictionary.fallout3functions['addspecialpoints'] = new scriptFunction('void');
	dictionary.fallout3functions['settagskills'] = new scriptFunction('void');
	dictionary.fallout3functions['addtagskills'] = new scriptFunction('void');
	dictionary.fallout3functions['sin'] = new scriptFunction('float', 'B', 0, [new scriptFunctionParam('float', 'x'), new scriptFunctionParam('int', 'arcsine flag', true)], {docLink: 'http://geck.bethsoft.com/index.php/Sin', name: 'sin'}); //0-1
	dictionary.fallout3functions['cos'] = new scriptFunction('float', 'B', 0, [new scriptFunctionParam('float', 'x'), new scriptFunctionParam('int', 'arccosine flag', true)], {docLink: 'http://geck.bethsoft.com/index.php/Cos', name: 'cos'}); //0-1
	dictionary.fallout3functions['tan'] = new scriptFunction('float', 'B', 0, [new scriptFunctionParam('float', 'x'), new scriptFunctionParam('int', 'arctangent flag', true)], {docLink: 'http://geck.bethsoft.com/index.php/Tan', name: 'tan'});
	dictionary.fallout3functions['sqrt'] = new scriptFunction('float', 'B', 0, [new scriptFunctionParam('float', 'x')], {docLink: 'http://geck.bethsoft.com/index.php/Sqrt', name: 'sqrt'}); //0+
	dictionary.fallout3functions['log'] = new scriptFunction('float', 'B', 0, [new scriptFunctionParam('float', 'x'), new scriptFunctionParam('float', 'base', true)], {docLink: 'http://geck.bethsoft.com/index.php/Log', name: 'log'});
	dictionary.fallout3functions['abs'] = new scriptFunction('float', 'B', 0, [new scriptFunctionParam('float', 'x')], {docLink: 'http://geck.bethsoft.com/index.php/Abs', name: 'abs'}); //0+
	dictionary.fallout3functions['getquestcompleted'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['getqc'] = alias(dictionary.fallout3functions['getquestcompleted']); //0, 1
	dictionary.fallout3functions['forceterminalback'] = new scriptFunction('void');
	dictionary.fallout3functions['pipboyradiooff'] = new scriptFunction('void');
	dictionary.fallout3functions['autodisplayobjectives'] = new scriptFunction('void');
	dictionary.fallout3functions['isgoredisabled'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['fadesfx'] = new scriptFunction('void');
	dictionary.fallout3functions['fsfx'] = alias(dictionary.fallout3functions['fadesfx']);
	dictionary.fallout3functions['setminimaluse'] = new scriptFunction('void');
	dictionary.fallout3functions['setpccanusepowerarmor'] = new scriptFunction('void');
	dictionary.fallout3functions['showqueststages'] = new scriptFunction('void');
	dictionary.fallout3functions['sqs'] = alias(dictionary.fallout3functions['showqueststages']);
	dictionary.fallout3functions['getspellusagenum'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['forceradiostationupdate'] = new scriptFunction('void');
	dictionary.fallout3functions['frsu'] = alias(dictionary.fallout3functions['forceradiostationupdate']);
	dictionary.fallout3functions['getactorsinhigh'] = new scriptFunction('void', 'D', 0, []);
	dictionary.fallout3functions['hasloaded3d'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['disableallmines'] = new scriptFunction('void');
	dictionary.fallout3functions['setlastextdooractivated'] = new scriptFunction('void');
	dictionary.fallout3functions['killquestupdates'] = new scriptFunction('void');
	dictionary.fallout3functions['kqu'] = alias(dictionary.fallout3functions['killquestupdates']);
	dictionary.fallout3functions['isimagespaceactive'] = new scriptFunction('int'); //0, 1
	dictionary.fallout3functions['remapwatertype'] = new scriptFunction('void');
	dictionary.fallout3functions['additemtoleveledlist'] = new scriptFunction('void');
	dictionary.fallout3functions['addcreaturetoleveledlist'] = new scriptFunction('void');
	dictionary.fallout3functions['addnpctoleveledlist'] = new scriptFunction('void');
	dictionary.fallout3functions['addformtoformlist'] = new scriptFunction('void');
}

//FOSE Functions
{
	//FOSE v1
	dictionary.fosefunctions['addspellns'] = new scriptFunction('void', 'R', 1.00, [new scriptFunctionParam('ref', 'spell')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#AddSpellNS', name: 'AddSpellNS'});
	dictionary.fosefunctions['ceil'] = new scriptFunction('float', 'B', 1.00, [new scriptFunctionParam('float', 'float')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#Ceil', name: 'Ceil'});
	dictionary.fosefunctions['comparenames'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'inv item'), new scriptFunctionParam('ref', 'target item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#CompareNames', name: 'CompareNames'});
	dictionary.fosefunctions['con_closeallmenus'] = new scriptFunction('void', 'B', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#con_CloseAllMenus', name: 'con_CloseAllMenus'});
	dictionary.fosefunctions['con_getinisetting'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('string', 'settingName')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#con_GetINISetting', name: 'con_GetINISetting'});
	dictionary.fosefunctions['con_loadgame'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('string', 'filename'), new scriptFunctionParam('int', 'Integer', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#con_LoadGame', name: 'con_LoadGame'});
	dictionary.fosefunctions['con_quitgame'] = new scriptFunction('void', 'B', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#con_QuitGame', name: 'con_QuitGame'});
	dictionary.fosefunctions['con_refreshini'] = new scriptFunction('void', 'B', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#con_RefreshINI', name: 'con_RefreshINI'});
	dictionary.fosefunctions['con_save'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('string', 'saveName'), new scriptFunctionParam('int', 'Integer', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#con_Save', name: 'con_Save'});
	dictionary.fosefunctions['con_saveini'] = new scriptFunction('void', 'B', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#con_SaveINI', name: 'con_SaveINI'});
	dictionary.fosefunctions['con_setcamerafov'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('float', 'Float', true), new scriptFunctionParam('float', 'Float', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#con_SetCameraFOV', name: 'con_SetCameraFOV'});
	dictionary.fosefunctions['con_setgamesetting'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('string', 'settingName'), new scriptFunctionParam('string', 'newValue')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#con_SetGameSetting', name: 'con_SetGameSetting'});
	dictionary.fosefunctions['con_setinisetting'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('string', 'setting'), new scriptFunctionParam('string', 'newValue')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#con_SetINISetting', name: 'con_SetINISetting'});
	dictionary.fosefunctions['con_setvel'] = new scriptFunction('void', 'R', 1.00, [new scriptFunctionParam('string', 'Axis', false, dictionary.values.axes), new scriptFunctionParam('float', 'Float')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#con_SetVel', name: 'con_SetVel'});
	dictionary.fosefunctions['debugprint'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('string', 'format string'), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#DebugPrint', name: 'DebugPrint', shortName: 'dbprintc', longName: 'DebugPrint'});
	dictionary.fosefunctions['dbprintc'] = alias(dictionary.fosefunctions['debugprint']);
	dictionary.fosefunctions['disablecontrol'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('int', 'controlCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#DisableControl', name: 'DisableControl', shortName: 'dc', longName: 'DisableControl'});
	dictionary.fosefunctions['dc'] = alias(dictionary.fosefunctions['disablecontrol']);
	dictionary.fosefunctions['disablekey'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('int', 'scanCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#DisableKey', name: 'DisableKey', shortName: 'dk', longName: 'DisableKey'});
	dictionary.fosefunctions['dk'] = alias(dictionary.fosefunctions['disablekey']);
	dictionary.fosefunctions['enablecontrol'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('int', 'controlCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#EnableControl', name: 'EnableControl', shortName: 'ec', longName: 'EnableControl'});
	dictionary.fosefunctions['ec'] = alias(dictionary.fosefunctions['enablecontrol']);
	dictionary.fosefunctions['enablekey'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('int', 'scanCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#EnableKey', name: 'EnableKey', shortName: 'ek', longName: 'EnableKey'});
	dictionary.fosefunctions['ek'] = alias(dictionary.fosefunctions['enablekey']);
	dictionary.fosefunctions['exp'] = new scriptFunction('float', 'B', 1.00, [new scriptFunctionParam('float', 'float')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#Exp', name: 'Exp'});
	dictionary.fosefunctions['floor'] = new scriptFunction('float', 'B', 1.00, [new scriptFunctionParam('float', 'float')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#Floor', name: 'Floor', shortName: 'flr', longName: 'Floor'});
	dictionary.fosefunctions['flr'] = alias(dictionary.fosefunctions['floor']);
	dictionary.fosefunctions['fmod'] = new scriptFunction('float', 'B', 1.00, [new scriptFunctionParam('float', 'x'), new scriptFunctionParam('float', 'n'), new scriptFunctionParam('float', 'offset', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#fmod', name: 'fmod'});
	dictionary.fosefunctions['getaltcontrol'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('int', 'controlCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetAltControl', name: 'GetAltControl'});
	dictionary.fosefunctions['getarmorarmorrating'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetArmorAR', name: 'GetArmorAR', shortName: 'GetArmorAR', longName: 'GetArmorArmorRating'});
	dictionary.fosefunctions['getarmorar'] = alias(dictionary.fosefunctions['getarmorarmorrating']);
	dictionary.fosefunctions['getattackdamage'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetAttackDamage', name: 'GetAttackDamage', shortName: 'GetDamage', longName: 'GetAttackDamage'});
	dictionary.fosefunctions['getdamage'] = alias(dictionary.fosefunctions['getattackdamage']);
	dictionary.fosefunctions['getbaseobject'] = new scriptFunction('ref', 'R', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetBaseObject', name: 'GetBaseObject', shortName: 'gbo', longName: 'GetBaseObject'});
	dictionary.fosefunctions['gbo'] = alias(dictionary.fosefunctions['getbaseobject']);
	dictionary.fosefunctions['getcontrol'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('int', 'controlCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetControl', name: 'GetControl'});
	dictionary.fosefunctions['getcrosshairref'] = new scriptFunction('ref', 'B', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetCrosshairRef', name: 'GetCrosshairRef'});
	dictionary.fosefunctions['getdebugmode'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('int', 'modIndex', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetDebugMode', name: 'GetDebugMode', shortName: 'GetDBMode', longName: 'GetDebugMode'});
	dictionary.fosefunctions['getdbmode'] = alias(dictionary.fosefunctions['getdebugmode']);
	dictionary.fosefunctions['getequippedcurrenthealth'] = new scriptFunction('float', 'R', 1.00, [new scriptFunctionParam('int', 'equipmentSlot')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetEquippedCurrentHealth', name: 'GetEquippedCurrentHealth', shortName: 'GetEqCurHealth', longName: 'GetEquippedCurrentHealth'});
	dictionary.fosefunctions['geteqcurhealth'] = alias(dictionary.fosefunctions['getequippedcurrenthealth']);
	dictionary.fosefunctions['getequippedobject'] = new scriptFunction('ref', 'R', 1.00, [new scriptFunctionParam('int', 'atIndex')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetEquippedObject', name: 'GetEquippedObject', shortName: 'GetEqObj', longName: 'GetEquippedObject'});
	dictionary.fosefunctions['geteqobj'] = alias(dictionary.fosefunctions['getequippedobject']);
	dictionary.fosefunctions['getequiptype'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetEquipType', name: 'GetEquipType'});
	dictionary.fosefunctions['getfirstref'] = new scriptFunction('ref', 'B', 1.00, [new scriptFunctionParam('int', 'form type', true), new scriptFunctionParam('int', 'cell depth', true), new scriptFunctionParam('int', 'include taken refs', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetFirstRef', name: 'GetFirstRef'});
	dictionary.fosefunctions['getfirstrefincell'] = new scriptFunction('ref', 'B', 1.00, [new scriptFunctionParam('ref', 'cell'), new scriptFunctionParam('int', 'form type', true), new scriptFunctionParam('int', 'cell depth', true), new scriptFunctionParam('int', 'include taken refs', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetFirstRefInCell', name: 'GetFirstRefInCell'});
	dictionary.fosefunctions['getfosebeta'] = new scriptFunction('int', 'B', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetFOSEBeta', name: 'GetFOSEBeta'});
	dictionary.fosefunctions['getfoserevision'] = new scriptFunction('int', 'B', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetFOSERevision', name: 'GetFOSERevision'});
	dictionary.fosefunctions['getfoseversion'] = new scriptFunction('int', 'B', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetFOSEVersion', name: 'GetFOSEVersion'});
	dictionary.fosefunctions['getgameloaded'] = new scriptFunction('int', 'B', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetGameLoaded', name: 'GetGameLoaded'});
	dictionary.fosefunctions['getgamerestarted'] = new scriptFunction('int', 'B', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetGameRestarted', name: 'GetGameRestarted'});
	dictionary.fosefunctions['getbasehealth'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetHealth', name: 'GetBaseHealth', shortName: 'GetHealth', longName: 'GetBaseHealth'});
	dictionary.fosefunctions['gethealth'] = alias(dictionary.fosefunctions['getbasehealth']);
	dictionary.fosefunctions['gethotkeyitem'] = new scriptFunction('ref', 'B', 1.00, [new scriptFunctionParam('int', 'hotkey')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetHotkeyItem', name: 'GetHotkeyItem'});
	dictionary.fosefunctions['getkeypress'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('int', 'index')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetKeyPress', name: 'GetKeyPress', shortName: 'gkp', longName: 'GetKeyPress'});
	dictionary.fosefunctions['gkp'] = alias(dictionary.fosefunctions['getkeypress']);
	dictionary.fosefunctions['getlinkeddoor'] = new scriptFunction('ref', 'R', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetLinkedDoor', name: 'GetLinkedDoor'});
	dictionary.fosefunctions['getmodindex'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('string', 'modName')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetModIndex', name: 'GetModIndex'});
	dictionary.fosefunctions['getmousebuttonpress'] = new scriptFunction('FixMe', 'B', 1.00, [new scriptFunctionParam('int', 'index')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetMouseButtonPress', name: 'GetMouseButtonPress', shortName: 'gmbp', longName: 'GetMouseButtonPress'});
	dictionary.fosefunctions['gmbp'] = alias(dictionary.fosefunctions['getmousebuttonpress']);
	dictionary.fosefunctions['getnextref'] = new scriptFunction('ref', 'B', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetNextRef', name: 'GetNextRef'});
	dictionary.fosefunctions['getnumericgamesetting'] = new scriptFunction('IntegerOrFloat', 'B', 1.00, [new scriptFunctionParam('string', 'settingName')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetNumericGameSetting', name: 'GetNumericGameSetting'});
	dictionary.fosefunctions['getnumericinisetting'] = new scriptFunction('IntegerOrFloat', 'B', 1.00, [new scriptFunctionParam('string', 'settingName')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetNumericINISetting', name: 'GetNumericINISetting'});
	dictionary.fosefunctions['getnumkeyspressed'] = new scriptFunction('int', 'B', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetNumKeysPressed', name: 'GetNumKeysPressed', shortName: 'gnkp', longName: 'GetNumKeysPressed'});
	dictionary.fosefunctions['gnkp'] = alias(dictionary.fosefunctions['getnumkeyspressed']);
	dictionary.fosefunctions['getnumloadedmods'] = new scriptFunction('int', 'B', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetNumLoadedMods', name: 'GetNumLoadedMods'});
	dictionary.fosefunctions['getnummousebuttonspressed'] = new scriptFunction('int', 'B', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetNumMouseButtonsPressed', name: 'GetNumMouseButtonsPressed', shortName: 'gnmbp', longName: 'GetNumMouseButtonsPressed'});
	dictionary.fosefunctions['gnmbp'] = alias(dictionary.fosefunctions['getnummousebuttonspressed']);
	dictionary.fosefunctions['getnumrefs'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('int', 'form type', true), new scriptFunctionParam('int', 'cell depth', true), new scriptFunctionParam('int', 'include taken refs', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetNumRefs', name: 'GetNumRefs'});
	dictionary.fosefunctions['getnumrefsincell'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('ref', 'cell'), new scriptFunctionParam('int', 'form type', true), new scriptFunctionParam('int', 'cell depth', true), new scriptFunctionParam('int', 'include taken refs', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetNumRefsInCell', name: 'GetNumRefsInCell'});
	dictionary.fosefunctions['getobjecteffect'] = new scriptFunction('ref', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetObjectEffect', name: 'GetObjectEffect', shortName: 'GetEnchantment', longName: 'GetObjectEffect'});
	dictionary.fosefunctions['getenchantment'] = alias(dictionary.fosefunctions['getobjecteffect']);
	dictionary.fosefunctions['getopenkey'] = new scriptFunction('ref', 'R', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetOpenKey', name: 'GetOpenKey', shortName: 'GetKey', longName: 'GetOpenKey'});
	dictionary.fosefunctions['getkey'] = alias(dictionary.fosefunctions['getopenkey']);
	dictionary.fosefunctions['getparentcell'] = new scriptFunction('ref', 'R', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetParentCell', name: 'GetParentCell', shortName: 'gpc', longName: 'GetParentCell'});
	dictionary.fosefunctions['gpc'] = alias(dictionary.fosefunctions['getparentcell']);
	dictionary.fosefunctions['getparentworldspace'] = new scriptFunction('ref', 'R', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetParentWorldspace', name: 'GetParentWorldspace', shortName: 'gpw', longName: 'GetParentWorldspace'});
	dictionary.fosefunctions['gpw'] = alias(dictionary.fosefunctions['getparentworldspace']);
	dictionary.fosefunctions['getrepairlist'] = new scriptFunction('ref', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetRepairList', name: 'GetRepairList', shortName: 'grl', longName: 'GetRepairList'});
	dictionary.fosefunctions['grl'] = alias(dictionary.fosefunctions['getrepairlist']);
	dictionary.fosefunctions['getscript'] = new scriptFunction('ref', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetScript', name: 'GetScript'});
	dictionary.fosefunctions['getsourcemodindex'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetSourceModIndex', name: 'GetSourceModIndex'});
	dictionary.fosefunctions['getteleportcell'] = new scriptFunction('ref', 'R', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetTeleportCell', name: 'GetTeleportCell'});
	dictionary.fosefunctions['getobjecttype'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetType', name: 'GetObjectType', shortName: 'GetType', longName: 'GetObjectType'});
	dictionary.fosefunctions['gettype'] = alias(dictionary.fosefunctions['getobjecttype']);
	dictionary.fosefunctions['getuifloat'] = new scriptFunction('float', 'B', 1.00, [new scriptFunctionParam('string', 'traitName')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetUIFloat', name: 'GetUIFloat'});
	dictionary.fosefunctions['getitemvalue'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetValue', name: 'GetItemValue', shortName: 'GetValue', longName: 'GetItemValue'});
	dictionary.fosefunctions['getvalue'] = alias(dictionary.fosefunctions['getitemvalue']);
	dictionary.fosefunctions['getweaponactionpoints'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponActionPoints', name: 'GetWeaponActionPoints', shortName: 'GetAP', longName: 'GetWeaponActionPoints'});
	dictionary.fosefunctions['getap'] = alias(dictionary.fosefunctions['getweaponactionpoints']);
	dictionary.fosefunctions['getweaponaimarc'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponAimArm', name: 'GetWeaponAimArm', shortName: 'GetAimArc', longName: 'GetWeaponAimArm'});
	dictionary.fosefunctions['getaimarc'] = alias(dictionary.fosefunctions['getweaponaimarc']);
	dictionary.fosefunctions['getweaponammo'] = new scriptFunction('ref', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponAmmo', name: 'GetWeaponAmmo', shortName: 'GetAmmo', longName: 'GetWeaponAmmo'});
	dictionary.fosefunctions['getammo'] = alias(dictionary.fosefunctions['getweaponammo']);
	dictionary.fosefunctions['getweaponammouse'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponAmmoUse', name: 'GetWeaponAmmoUse', shortName: 'GetAmmoUse', longName: 'GetWeaponAmmoUse'});
	dictionary.fosefunctions['getammouse'] = alias(dictionary.fosefunctions['getweaponammouse']);
	dictionary.fosefunctions['getweaponanimattackmult'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponAnimAttackMult', name: 'GetWeaponAnimAttackMult', shortName: 'GetAnimAttackMult', longName: 'GetWeaponAnimAttackMult'});
	dictionary.fosefunctions['getanimattackmult'] = alias(dictionary.fosefunctions['getweaponanimattackmult']);
	dictionary.fosefunctions['getweaponanimjamtime'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponAnimJamTime', name: 'GetWeaponAnimJamTime', shortName: 'GetAnimJamTime', longName: 'GetWeaponAnimJamTime'});
	dictionary.fosefunctions['getanimjamtime'] = alias(dictionary.fosefunctions['getweaponanimjamtime']);
	dictionary.fosefunctions['getweaponanimmult'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponAnimMult', name: 'GetWeaponAnimMult', shortName: 'GetAnimMult', longName: 'GetWeaponAnimMult'});
	dictionary.fosefunctions['getanimmult'] = alias(dictionary.fosefunctions['getweaponanimmult']);
	dictionary.fosefunctions['getweaponanimreloadtime'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponAnimReloadTime', name: 'GetWeaponAnimReloadTime', shortName: 'GetAnimReloadTime', longName: 'GetWeaponAnimReloadTime'});
	dictionary.fosefunctions['getanimreloadtime'] = alias(dictionary.fosefunctions['getweaponanimreloadtime']);
	dictionary.fosefunctions['getweaponanimshotspersec'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponAnimShotsPerSec', name: 'GetWeaponAnimShotsPerSec', shortName: 'GetAnimShotsPerSec', longName: 'GetWeaponAnimShotsPerSec'});
	dictionary.fosefunctions['getanimshotspersec'] = alias(dictionary.fosefunctions['getweaponanimshotspersec']);
	dictionary.fosefunctions['getweaponattackanimation'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponAttackAnimation', name: 'GetWeaponAttackAnimation', shortName: 'GetAttackAnim', longName: 'GetWeaponAttackAnimation'});
	dictionary.fosefunctions['getattackanim'] = alias(dictionary.fosefunctions['getweaponattackanimation']);
	dictionary.fosefunctions['getweaponbasevatschance'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponBaseVATSChance', name: 'GetWeaponBaseVATSChance', shortName: 'GetVATSChance', longName: 'GetWeaponBaseVATSChance'});
	dictionary.fosefunctions['getvatschance'] = alias(dictionary.fosefunctions['getweaponbasevatschance']);
	dictionary.fosefunctions['getweaponcliprounds'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponClipRounds', name: 'GetWeaponClipRounds', shortName: 'GetClipSize', longName: 'GetWeaponClipRounds'});
	dictionary.fosefunctions['getclipsize'] = alias(dictionary.fosefunctions['getweaponcliprounds']);
	dictionary.fosefunctions['getweaponcritchance'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponCritChance', name: 'GetWeaponCritChance', shortName: 'GetCritPerc', longName: 'GetWeaponCritChance'});
	dictionary.fosefunctions['getcritperc'] = alias(dictionary.fosefunctions['getweaponcritchance']);
	dictionary.fosefunctions['getweaponcritdamage'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponCritDamage', name: 'GetWeaponCritDamage', shortName: 'GetCritDam', longName: 'GetWeaponCritDamage'});
	dictionary.fosefunctions['getcritdam'] = alias(dictionary.fosefunctions['getweaponcritdamage']);
	dictionary.fosefunctions['getweaponcriteffect'] = new scriptFunction('ref', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponCritEffect', name: 'GetWeaponCritEffect', shortName: 'GetCritEffect', longName: 'GetWeaponCritEffect'});
	dictionary.fosefunctions['getcriteffect'] = alias(dictionary.fosefunctions['getweaponcriteffect']);
	dictionary.fosefunctions['getweaponfiredelaymax'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponFireDelayMax', name: 'GetWeaponFireDelayMax', shortName: 'GetFireDelayMax', longName: 'GetWeaponFireDelayMax'});
	dictionary.fosefunctions['getfiredelaymax'] = alias(dictionary.fosefunctions['getweaponfiredelaymax']);
	dictionary.fosefunctions['getweaponfiredelaymin'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponFireDelayMin', name: 'GetWeaponFireDelayMin', shortName: 'GetFireDelayMin', longName: 'GetWeaponFireDelayMin'});
	dictionary.fosefunctions['getfiredelaymin'] = alias(dictionary.fosefunctions['getweaponfiredelaymin']);
	dictionary.fosefunctions['getweaponfirerate'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponFireRate', name: 'GetWeaponFireRate', shortName: 'GetFireRate', longName: 'GetWeaponFireRate'});
	dictionary.fosefunctions['getfirerate'] = alias(dictionary.fosefunctions['getweaponfirerate']);
	dictionary.fosefunctions['getweaponhandgrip'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponHandGrip', name: 'GetWeaponHandGrip', shortName: 'GetHandGrip', longName: 'GetWeaponHandGrip'});
	dictionary.fosefunctions['gethandgrip'] = alias(dictionary.fosefunctions['getweaponhandgrip']);
	dictionary.fosefunctions['getweaponhasscope'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponHasScope', name: 'GetWeaponHasScope'});
	dictionary.fosefunctions['getweaponisautomatic'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponIsAutomatic', name: 'GetWeaponIsAutomatic', shortName: 'GetIsAutomatic', longName: 'GetWeaponIsAutomatic'});
	dictionary.fosefunctions['getisautomatic'] = alias(dictionary.fosefunctions['getweaponisautomatic']);
	dictionary.fosefunctions['getweaponlimbdamagemult'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponLimbDamageMult', name: 'GetWeaponLimbDamageMult', shortName: 'GetLimbDamageMult', longName: 'GetWeaponLimbDamageMult'});
	dictionary.fosefunctions['getlimbdamagemult'] = alias(dictionary.fosefunctions['getweaponlimbdamagemult']);
	dictionary.fosefunctions['getweaponmaxrange'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponMaxRange', name: 'GetWeaponMaxRange', shortName: 'GetMaxRange', longName: 'GetWeaponMaxRange'});
	dictionary.fosefunctions['getmaxrange'] = alias(dictionary.fosefunctions['getweaponmaxrange']);
	dictionary.fosefunctions['getweaponminrange'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponMinRange', name: 'GetWeaponMinRange', shortName: 'GetMinRange', longName: 'GetWeaponMinRange'});
	dictionary.fosefunctions['getminrange'] = alias(dictionary.fosefunctions['getweaponminrange']);
	dictionary.fosefunctions['getweaponminspread'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponMinSpread', name: 'GetWeaponMinSpread', shortName: 'GetMinSpread', longName: 'GetWeaponMinSpread'});
	dictionary.fosefunctions['getminspread'] = alias(dictionary.fosefunctions['getweaponminspread']);
	dictionary.fosefunctions['getweaponnumprojectiles'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponNumProjectiles', name: 'GetWeaponNumProjectiles', shortName: 'GetNumProj', longName: 'GetWeaponNumProjectiles'});
	dictionary.fosefunctions['getnumproj'] = alias(dictionary.fosefunctions['getweaponnumprojectiles']);
	dictionary.fosefunctions['getweaponprojectile'] = new scriptFunction('ref', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponProjectile', name: 'GetWeaponProjectile', shortName: 'GetWeapProj', longName: 'GetWeaponProjectile'});
	dictionary.fosefunctions['getweapproj'] = alias(dictionary.fosefunctions['getweaponprojectile']);
	dictionary.fosefunctions['getweaponreach'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponReach', name: 'GetWeaponReach', shortName: 'GetReach', longName: 'GetWeaponReach'});
	dictionary.fosefunctions['getreach'] = alias(dictionary.fosefunctions['getweaponreach']);
	dictionary.fosefunctions['getweaponreloadanim'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponReloadAnim', name: 'GetWeaponReloadAnim', shortName: 'GetReloadAnim', longName: 'GetWeaponReloadAnim'});
	dictionary.fosefunctions['getreloadanim'] = alias(dictionary.fosefunctions['getweaponreloadanim']);
	dictionary.fosefunctions['getweaponresisttype'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponResistType', name: 'GetWeaponResistType', shortName: 'GetWeaponResist', longName: 'GetWeaponResistType'});
	dictionary.fosefunctions['getweaponresist'] = alias(dictionary.fosefunctions['getweaponresisttype']);
	dictionary.fosefunctions['getweaponrumbleduration'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponRumbleDuration', name: 'GetWeaponRumbleDuration', shortName: 'GetRumbleDuration', longName: 'GetWeaponRumbleDuration'});
	dictionary.fosefunctions['getrumbleduration'] = alias(dictionary.fosefunctions['getweaponrumbleduration']);
	dictionary.fosefunctions['getweaponrumbleleftmotor'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponRumbleLeftMotor', name: 'GetWeaponRumbleLeftMotor', shortName: 'GetRumbleLeft', longName: 'GetWeaponRumbleLeftMotor'});
	dictionary.fosefunctions['getrumbleleft'] = alias(dictionary.fosefunctions['getweaponrumbleleftmotor']);
	dictionary.fosefunctions['getweaponrumblerightmotor'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponRumbleRightMotor', name: 'GetWeaponRumbleRightMotor', shortName: 'GetRumbleRight', longName: 'GetWeaponRumbleRightMotor'});
	dictionary.fosefunctions['getrumbleright'] = alias(dictionary.fosefunctions['getweaponrumblerightmotor']);
	dictionary.fosefunctions['getweaponrumblewavelength'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponRumbleWaveLength', name: 'GetWeaponRumbleWaveLength', shortName: 'GetRumbleWaveLen', longName: 'GetWeaponRumbleWaveLength'});
	dictionary.fosefunctions['getrumblewavelen'] = alias(dictionary.fosefunctions['getweaponrumblewavelength']);
	dictionary.fosefunctions['getweaponsightfov'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponSightFOV', name: 'GetWeaponSightFOV', shortName: 'GetSightFOV', longName: 'GetWeaponSightFOV'});
	dictionary.fosefunctions['getsightfov'] = alias(dictionary.fosefunctions['getweaponsightfov']);
	dictionary.fosefunctions['getweaponsightusage'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponSightUsage', name: 'GetWeaponSightUsage', shortName: 'GetSightUsage', longName: 'GetWeaponSightUsage'});
	dictionary.fosefunctions['getsightusage'] = alias(dictionary.fosefunctions['getweaponsightusage']);
	dictionary.fosefunctions['getweaponskill'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponSkill', name: 'GetWeaponSkill'});
	dictionary.fosefunctions['getweaponspread'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponSpread', name: 'GetWeaponSpread', shortName: 'GetSpread', longName: 'GetWeaponSpread'});
	dictionary.fosefunctions['getspread'] = alias(dictionary.fosefunctions['getweaponspread']);
	dictionary.fosefunctions['getweapontype'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeaponType', name: 'GetWeaponType', shortName: 'GetWeapType', longName: 'GetWeaponType'});
	dictionary.fosefunctions['getweaptype'] = alias(dictionary.fosefunctions['getweapontype']);
	dictionary.fosefunctions['getweight'] = new scriptFunction('float', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#GetWeight', name: 'GetWeight'});
	dictionary.fosefunctions['goto'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('int', 'labelID')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#Goto', name: 'Goto'});
	dictionary.fosefunctions['holdkey'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('int', 'scanCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#HoldKey', name: 'HoldKey', shortName: 'hk', longName: 'HoldKey'});
	dictionary.fosefunctions['hk'] = alias(dictionary.fosefunctions['holdkey']);
	dictionary.fosefunctions['isclonedform'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#IsClonedForm', name: 'IsClonedForm', shortName: 'IsCloned', longName: 'IsClonedForm'});
	dictionary.fosefunctions['iscloned'] = alias(dictionary.fosefunctions['isclonedform']);
	dictionary.fosefunctions['iscontrol'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('int', 'scanCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#IsControl', name: 'IsControl'});
	dictionary.fosefunctions['iscontroldisabled'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('int', 'controlCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#IsControlDisabled', name: 'IsControlDisabled'});
	dictionary.fosefunctions['iscontrolpressed'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('int', 'controlCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#IsControlPressed', name: 'IsControlPressed'});
	dictionary.fosefunctions['isformvalid'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'refVar', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#IsFormValid', name: 'IsFormValid'});
	dictionary.fosefunctions['iskeydisabled'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('int', 'scanCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#IsKeyDisabled', name: 'IsKeyDisabled'});
	dictionary.fosefunctions['iskeypressed'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('int', 'scanCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#IsKeyPressed', name: 'IsKeyPressed'});
	dictionary.fosefunctions['ismodloaded'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('string', 'modName')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#IsModLoaded', name: 'IsModLoaded'});
	dictionary.fosefunctions['ispowerarmor'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#IsPowerArmor', name: 'IsPowerArmor', shortName: 'IsPA', longName: 'IsPowerArmor'});
	dictionary.fosefunctions['ispa'] = alias(dictionary.fosefunctions['ispowerarmor']);
	dictionary.fosefunctions['isreference'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('ref', 'reference')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#IsReference', name: 'IsReference'});
	dictionary.fosefunctions['isscripted'] = new scriptFunction('int', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#IsScripted', name: 'IsScripted'});
	dictionary.fosefunctions['label'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('int', 'labelID')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#Label', name: 'Label'});
	dictionary.fosefunctions['leftshift'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('int', 'int'), new scriptFunctionParam('int', 'int')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#LeftShift', name: 'LeftShift'});
	dictionary.fosefunctions['listaddform'] = new scriptFunction('ref', 'B', 1.00, [new scriptFunctionParam('ref', 'form list'), new scriptFunctionParam('ref', 'form'), new scriptFunctionParam('int', 'index', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#ListAddForm', name: 'ListAddForm'});
	dictionary.fosefunctions['listaddreference'] = new scriptFunction('int', 'R', 1.00, [new scriptFunctionParam('ref', 'form list'), new scriptFunctionParam('int', 'index', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#ListAddReference', name: 'ListAddReference', shortName: 'ListAddRef', longName: 'ListAddReference'});
	dictionary.fosefunctions['listaddref'] = alias(dictionary.fosefunctions['listaddreference']);
	dictionary.fosefunctions['listgetcount'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('ref', 'form list')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#ListGetCount', name: 'ListGetCount'});
	dictionary.fosefunctions['listgetformindex'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('ref', 'form list'), new scriptFunctionParam('ref', 'form')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#ListGetFormIndex', name: 'ListGetFormIndex'});
	dictionary.fosefunctions['listgetnthform'] = new scriptFunction('ref', 'B', 1.00, [new scriptFunctionParam('ref', 'form list'), new scriptFunctionParam('int', 'index')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#ListGetNthForm', name: 'ListGetNthForm'});
	dictionary.fosefunctions['listremoveform'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('ref', 'form list'), new scriptFunctionParam('ref', 'form')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#ListRemoveForm', name: 'ListRemoveForm'});
	dictionary.fosefunctions['listremoventhform'] = new scriptFunction('ref', 'B', 1.00, [new scriptFunctionParam('ref', 'form list'), new scriptFunctionParam('int', 'index', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#ListRemoveNthForm', name: 'ListRemoveNthForm', shortName: 'ListRemoveNth', longName: 'ListRemoveNthForm'});
	dictionary.fosefunctions['listremoventh'] = alias(dictionary.fosefunctions['listremoventhform']);
	dictionary.fosefunctions['listreplaceform'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('ref', 'form list'), new scriptFunctionParam('ref', 'replaceWith'), new scriptFunctionParam('ref', 'formToReplace')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#ListReplaceForm', name: 'ListReplaceForm'});
	dictionary.fosefunctions['listreplacenthform'] = new scriptFunction('ref', 'B', 1.00, [new scriptFunctionParam('ref', 'form list'), new scriptFunctionParam('ref', 'replaceWith'), new scriptFunctionParam('int', 'formIndex', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#ListReplaceNthForm', name: 'ListReplaceNthForm', shortName: 'ListReplaceNth', longName: 'ListReplaceNthForm'});
	dictionary.fosefunctions['listreplacenth'] = alias(dictionary.fosefunctions['listreplacenthform']);
	dictionary.fosefunctions['log10'] = new scriptFunction('float', 'B', 1.00, [new scriptFunctionParam('float', 'float')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#Log10', name: 'Log10'});
	dictionary.fosefunctions['logicaland'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('int', 'int'), new scriptFunctionParam('int', 'int')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#LogicalAnd', name: 'LogicalAnd'});
	dictionary.fosefunctions['logicalnot'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('int', 'int')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#LogicalNot', name: 'LogicalNot'});
	dictionary.fosefunctions['logicalor'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('int', 'int'), new scriptFunctionParam('int', 'int')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#LogicalOr', name: 'LogicalOr'});
	dictionary.fosefunctions['logicalxor'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('int', 'int'), new scriptFunctionParam('int', 'int')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#LogicalXor', name: 'LogicalXor'});
	dictionary.fosefunctions['menuholdkey'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('int', 'scanCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#MenuHoldKey', name: 'MenuHoldKey', shortName: 'mhk', longName: 'MenuHoldKey'});
	dictionary.fosefunctions['mhk'] = alias(dictionary.fosefunctions['menuholdkey']);
	dictionary.fosefunctions['menureleasekey'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('int', 'scanCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#MenuReleaseKey', name: 'MenuReleaseKey', shortName: 'mrk', longName: 'MenuReleaseKey'});
	dictionary.fosefunctions['mrk'] = alias(dictionary.fosefunctions['menureleasekey']);
	dictionary.fosefunctions['menutapkey'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('int', 'scanCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#MenuTapKey', name: 'MenuTapKey', shortName: 'mtk', longName: 'MenuTapKey'});
	dictionary.fosefunctions['mtk'] = alias(dictionary.fosefunctions['menutapkey']);
	dictionary.fosefunctions['printactivetile'] = new scriptFunction('void', 'B', 1.00, [], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#PrintActiveTile', name: 'PrintActiveTile'});
	dictionary.fosefunctions['printtoconsole'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('string', 'format string'), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true), new scriptFunctionParam('float', 'variable', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#PrintToConsole', name: 'PrintToConsole', shortName: 'printc', longName: 'PrintToConsole'});
	dictionary.fosefunctions['printc'] = alias(dictionary.fosefunctions['printtoconsole']);
	dictionary.fosefunctions['releasekey'] = new scriptFunction('FixMe', 'B', 1.00, [new scriptFunctionParam('int', 'scanCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#ReleaseKey', name: 'ReleaseKey', shortName: 'rk', longName: 'ReleaseKey'});
	dictionary.fosefunctions['rk'] = alias(dictionary.fosefunctions['releasekey']);
	dictionary.fosefunctions['removescript'] = new scriptFunction('ref', 'E', 1.00, [new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#RemoveScript', name: 'RemoveScript'});
	dictionary.fosefunctions['rightshift'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('int', 'int'), new scriptFunctionParam('int', 'int')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#RightShift', name: 'RightShift'});
	dictionary.fosefunctions['setaltcontrol'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('int', 'controlCode'), new scriptFunctionParam('int', 'scanCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetAltControl', name: 'SetAltControl'});
	dictionary.fosefunctions['setattackdamage'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('int', 'damage'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetAttackDamage', name: 'SetAttackDamage', shortName: 'SetDamage', longName: 'SetAttackDamage'});
	dictionary.fosefunctions['setdamage'] = alias(dictionary.fosefunctions['setattackdamage']);
	dictionary.fosefunctions['setbaseitemvalue'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('ref', 'form'), new scriptFunctionParam('int', 'newValue')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetBaseItemValue', name: 'SetBaseItemValue', shortName: 'SetValue', longName: 'SetBaseItemValue'});
	dictionary.fosefunctions['setvalue'] = alias(dictionary.fosefunctions['setbaseitemvalue']);
	dictionary.fosefunctions['setcontrol'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('int', 'controlCode'), new scriptFunctionParam('int', 'scanCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetControl', name: 'SetControl'});
	dictionary.fosefunctions['setdebugmode'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('int', 'bEnableDebugMessages'), new scriptFunctionParam('int', 'modIndex', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetDebugMode', name: 'SetDebugMode', shortName: 'DBMode', longName: 'SetDebugMode'});
	dictionary.fosefunctions['dbmode'] = alias(dictionary.fosefunctions['setdebugmode']);
	dictionary.fosefunctions['setequippedcurrenthealth'] = new scriptFunction('void', 'R', 1.00, [new scriptFunctionParam('float', 'val'), new scriptFunctionParam('int', 'equipmentSlot')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetEquippedCurrentHealth', name: 'SetEquippedCurrentHealth', shortName: 'SetEqCurHealth', longName: 'SetEquippedCurrentHealth'});
	dictionary.fosefunctions['seteqcurhealth'] = alias(dictionary.fosefunctions['setequippedcurrenthealth']);
	dictionary.fosefunctions['setobjecthealth'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('int', 'newHealth'), new scriptFunctionParam('ref', 'form', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetHealth', name: 'SetObjectHealth', shortName: 'SetHealth', longName: 'SetObjectHealth'});
	dictionary.fosefunctions['sethealth'] = alias(dictionary.fosefunctions['setobjecthealth']);
	dictionary.fosefunctions['setiscontrol'] = new scriptFunction('int', 'B', 1.00, [new scriptFunctionParam('int', 'scanCode'), new scriptFunctionParam('int', 'isControl')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetIsControl', name: 'SetIsControl'});
	dictionary.fosefunctions['setispowerarmor'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('int', 'path type'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetIsPowerArmor', name: 'SetIsPowerArmor', shortName: 'SetIsPA', longName: 'SetIsPowerArmor'});
	dictionary.fosefunctions['setispa'] = alias(dictionary.fosefunctions['setispowerarmor']);
	dictionary.fosefunctions['setname'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('string', 'name'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetName', name: 'SetName'});
	dictionary.fosefunctions['setnumericgamesetting'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('string', 'settingName'), new scriptFunctionParam('float', 'float')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetNumericGameSetting', name: 'SetNumericGameSetting'});
	dictionary.fosefunctions['setnumericinisetting'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('string', 'settingName'), new scriptFunctionParam('float', 'newValue')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetNumericINISetting', name: 'SetNumericINISetting'});
	dictionary.fosefunctions['setopenkey'] = new scriptFunction('void', 'R', 1.00, [new scriptFunctionParam('ref', 'item')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetOpenKey', name: 'SetOpenKey', shortName: 'SetKey', longName: 'SetOpenKey'});
	dictionary.fosefunctions['setkey'] = alias(dictionary.fosefunctions['setopenkey']);
	dictionary.fosefunctions['setrepairlist'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('ref', 'form list'), new scriptFunctionParam('ref', 'target item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetRepairList', name: 'SetRepairList'});
	dictionary.fosefunctions['setscript'] = new scriptFunction('ref', 'E', 1.00, [new scriptFunctionParam('ref', 'scriptInRef'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetScript', name: 'SetScript'});
	dictionary.fosefunctions['setuifloat'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('string', 'traitName'), new scriptFunctionParam('float', 'newValue')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetUIFloat', name: 'SetUIFloat'});
	dictionary.fosefunctions['setuistring'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('string', 'traitName'), new scriptFunctionParam('string', 'newValue')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetUIString', name: 'SetUIString'});
	dictionary.fosefunctions['setweaponactionpoints'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('float', 'float'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponActionPoints', name: 'SetWeaponActionPoints', shortName: 'SetAP', longName: 'SetWeaponActionPoints'});
	dictionary.fosefunctions['setap'] = alias(dictionary.fosefunctions['setweaponactionpoints']);
	dictionary.fosefunctions['setweaponaimarc'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('float', 'aimArc'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponAimArc', name: 'SetWeaponAimArc', shortName: 'SetAimArc', longName: 'SetWeaponAimArc'});
	dictionary.fosefunctions['setaimarc'] = alias(dictionary.fosefunctions['setweaponaimarc']);
	dictionary.fosefunctions['setweaponammo'] = new scriptFunction('ref', 'E', 1.00, [new scriptFunctionParam('ref', 'NewAmmoInRef'), new scriptFunctionParam('ref', 'target item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponAmmo', name: 'SetWeaponAmmo', shortName: 'SetAmmo', longName: 'SetWeaponAmmo'});
	dictionary.fosefunctions['setammo'] = alias(dictionary.fosefunctions['setweaponammo']);
	dictionary.fosefunctions['setweaponammouse'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('int', 'path type'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponAmmoUse', name: 'SetWeaponAmmoUse', shortName: 'SetAmmoUse', longName: 'SetWeaponAmmoUse'});
	dictionary.fosefunctions['setammouse'] = alias(dictionary.fosefunctions['setweaponammouse']);
	dictionary.fosefunctions['setweaponanimattackmult'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('float', 'float'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponAnimAttackMult', name: 'SetWeaponAnimAttackMult', shortName: 'SetAnimAttackMult', longName: 'SetWeaponAnimAttackMult'});
	dictionary.fosefunctions['setanimattackmult'] = alias(dictionary.fosefunctions['setweaponanimattackmult']);
	dictionary.fosefunctions['setweaponanimmult'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('float', 'float'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponAnimMult', name: 'SetWeaponAnimMult', shortName: 'SetAnimMult', longName: 'SetWeaponAnimMult'});
	dictionary.fosefunctions['setanimmult'] = alias(dictionary.fosefunctions['setweaponanimmult']);
	dictionary.fosefunctions['setweaponattackanimation'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('int', 'attackAnimation'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponAttackAnimation', name: 'SetWeaponAttackAnimation', shortName: 'SetAttackAnim', longName: 'SetWeaponAttackAnimation'});
	dictionary.fosefunctions['setattackanim'] = alias(dictionary.fosefunctions['setweaponattackanimation']);
	dictionary.fosefunctions['setweaponbasevatschance'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('int', 'newVATSChance'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponBaseVATSChance', name: 'SetWeaponBaseVATSChance', shortName: 'SetVATSChance', longName: 'SetWeaponBaseVATSChance'});
	dictionary.fosefunctions['setvatschance'] = alias(dictionary.fosefunctions['setweaponbasevatschance']);
	dictionary.fosefunctions['setweaponcliprounds'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('int', 'path type'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponClipRounds', name: 'SetWeaponClipRounds', shortName: 'SetClipSize', longName: 'SetWeaponClipRounds'});
	dictionary.fosefunctions['setclipsize'] = alias(dictionary.fosefunctions['setweaponcliprounds']);
	dictionary.fosefunctions['setweaponcritchance'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('float', 'float'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponCritChance', name: 'SetWeaponCritChance', shortName: 'SetCritPerc', longName: 'SetWeaponCritChance'});
	dictionary.fosefunctions['setcritperc'] = alias(dictionary.fosefunctions['setweaponcritchance']);
	dictionary.fosefunctions['setweaponcritdamage'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('int', 'path type'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponCritDamage', name: 'SetWeaponCritDamage'});
	dictionary.fosefunctions['setweaponcriteffect'] = new scriptFunction('ref', 'E', 1.00, [new scriptFunctionParam('ref', 'magic item'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponCritEffect', name: 'SetWeaponCritEffect', shortName: 'SetCritEffect', longName: 'SetWeaponCritEffect'});
	dictionary.fosefunctions['setcriteffect'] = alias(dictionary.fosefunctions['setweaponcriteffect']);
	dictionary.fosefunctions['setweaponhandgrip'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('int', 'handGrip'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponHandGrip', name: 'SetWeaponHandGrip', shortName: 'SetHandGrip', longName: 'SetWeaponHandGrip'});
	dictionary.fosefunctions['sethandgrip'] = alias(dictionary.fosefunctions['setweaponhandgrip']);
	dictionary.fosefunctions['setweaponisautomatic'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('int', 'isAutomatic'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponIsAutomatic', name: 'SetWeaponIsAutomatic', shortName: 'SetIsAutomatic', longName: 'SetWeaponIsAutomatic'});
	dictionary.fosefunctions['setisautomatic'] = alias(dictionary.fosefunctions['setweaponisautomatic']);
	dictionary.fosefunctions['setweaponlimbdamagemult'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('float', 'limbDamageMult'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponLimbDamageMult', name: 'SetWeaponLimbDamageMult', shortName: 'SetLimbDamageMult', longName: 'SetWeaponLimbDamageMult'});
	dictionary.fosefunctions['setlimbdamagemult'] = alias(dictionary.fosefunctions['setweaponlimbdamagemult']);
	dictionary.fosefunctions['setweaponmaxrange'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('float', 'float'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponMaxRange', name: 'SetWeaponMaxRange', shortName: 'SetMaxRange', longName: 'SetWeaponMaxRange'});
	dictionary.fosefunctions['setmaxrange'] = alias(dictionary.fosefunctions['setweaponmaxrange']);
	dictionary.fosefunctions['setweaponminrange'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('float', 'float'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponMinRange', name: 'SetWeaponMinRange', shortName: 'SetMinRange', longName: 'SetWeaponMinRange'});
	dictionary.fosefunctions['setminrange'] = alias(dictionary.fosefunctions['setweaponminrange']);
	dictionary.fosefunctions['setweaponminspread'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('float', 'float'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponMinSpread', name: 'SetWeaponMinSpread', shortName: 'SetMinSpread', longName: 'SetWeaponMinSpread'});
	dictionary.fosefunctions['setminspread'] = alias(dictionary.fosefunctions['setweaponminspread']);
	dictionary.fosefunctions['setweaponnumprojectiles'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('int', 'numProjectiles'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponNumProjectiles', name: 'SetWeaponNumProjectiles', shortName: 'SetNumProj', longName: 'SetWeaponNumProjectiles'});
	dictionary.fosefunctions['setnumproj'] = alias(dictionary.fosefunctions['setweaponnumprojectiles']);
	dictionary.fosefunctions['setweaponprojectile'] = new scriptFunction('ref', 'E', 1.00, [new scriptFunctionParam('ref', 'NewProjectileInRef'), new scriptFunctionParam('ref', 'target item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponProjectile', name: 'SetWeaponProjectile', shortName: 'SetProjectile', longName: 'SetWeaponProjectile'});
	dictionary.fosefunctions['setprojectile'] = alias(dictionary.fosefunctions['setweaponprojectile']);
	dictionary.fosefunctions['setweaponreach'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('float', 'reach'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponReach', name: 'SetWeaponReach', shortName: 'SetReach', longName: 'SetWeaponReach'});
	dictionary.fosefunctions['setreach'] = alias(dictionary.fosefunctions['setweaponreach']);
	dictionary.fosefunctions['setweaponreloadanim'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('int', 'reloadAnim'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponReloadAnim', name: 'SetWeaponReloadAnim', shortName: 'SetReloadAnim', longName: 'SetWeaponReloadAnim'});
	dictionary.fosefunctions['setreloadanim'] = alias(dictionary.fosefunctions['setweaponreloadanim']);
	dictionary.fosefunctions['setweaponsightfov'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('float', 'float'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponSightFOV', name: 'SetWeaponSightFOV', shortName: 'SetSightFOV', longName: 'SetWeaponSightFOV'});
	dictionary.fosefunctions['setsightfov'] = alias(dictionary.fosefunctions['setweaponsightfov']);
	dictionary.fosefunctions['setweaponsightusage'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('float', 'sightUsage'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponSightUsage', name: 'SetWeaponSightUsage', shortName: 'SetSightUsage', longName: 'SetWeaponSightUsage'});
	dictionary.fosefunctions['setsightusage'] = alias(dictionary.fosefunctions['setweaponsightusage']);
	dictionary.fosefunctions['setweaponspread'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('float', 'float'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponSpread', name: 'SetWeaponSpread', shortName: 'SetSpread', longName: 'SetWeaponSpread'});
	dictionary.fosefunctions['setspread'] = alias(dictionary.fosefunctions['setweaponspread']);
	dictionary.fosefunctions['setweapontype'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('int', 'weaponType'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeaponType', name: 'SetWeaponType'});
	dictionary.fosefunctions['setweight'] = new scriptFunction('void', 'E', 1.00, [new scriptFunctionParam('float', 'float'), new scriptFunctionParam('ref', 'item', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#SetWeight', name: 'SetWeight'});
	dictionary.fosefunctions['tapcontrol'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('int', 'controlCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#TapControl', name: 'TapControl', shortName: 'tc', longName: 'TapControl'});
	dictionary.fosefunctions['tc'] = alias(dictionary.fosefunctions['tapcontrol']);
	dictionary.fosefunctions['tapkey'] = new scriptFunction('void', 'B', 1.00, [new scriptFunctionParam('int', 'scanCode')], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#TapKey', name: 'TapKey', shortName: 'tk', longName: 'TapKey'});
	dictionary.fosefunctions['tk'] = alias(dictionary.fosefunctions['tapkey']);
	dictionary.fosefunctions['tempcloneform'] = new scriptFunction('ref', 'E', 1.00, [new scriptFunctionParam('ref', 'formToClone', true)], {docLink: 'http://fose.silverlock.org/fose_command_doc.html#TempCloneForm', name: 'TempCloneForm'});

	//FOSE 1.2 temp docs
	dictionary.fosefunctions['getcurrenthealth'] = new scriptFunction('float', 'R', 1.2, []);
	dictionary.fosefunctions['setcurrenthealth'] = new scriptFunction('void', 'E', 1.2, [new scriptFunctionParam('float', 'health'), new scriptFunctionParam('ref', 'form', true)]);
	dictionary.fosefunctions['rand'] = new scriptFunction('float', 'B', 1.2, [new scriptFunctionParam('float', 'min'), new scriptFunctionParam('float', 'max')]);
	dictionary.fosefunctions['getnumitems'] = new scriptFunction('int', 'R', 1.2, []);
	dictionary.fosefunctions['getinventoryobject'] = new scriptFunction('ref', 'R', 1.2, [new scriptFunctionParam('int', 'idx')]);
}

//New Vegas Functions
{
	dictionary.newvegasfunctions = combineObjects([dictionary.fallout3functions]);
}

//NVSE Functions
{
	dictionary.nvsefunctions = combineObjects([dictionary.fosefunctions]);
}

dictionary.functions = combineObjects([dictionary.fallout3functions, dictionary.fosefunctions]);