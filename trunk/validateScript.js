//The Fallout 3 script validator that this code is part of is available at http://www.cipscis.com/fallout/utilities/validator.aspx.  This file contains the validation framework, as well as code to extract input from and insert output into the html page on which the validator is hosted.  
//Copyright (C) 2010 Mark Hanna, a.k.a. Cipscis

//This code is free software: you can redistribute it and/or modify it under the terms of the GNU General Public LIcense as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

//This code is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

//See http://www.gnu.org/licenses/ for a copy of the GNU General Public License



var script = {};
var scriptTypes = ['result', 'quest', 'object', 'effect'];

function evaluateParams(paramsIn, paramsDef, functionName)
{
	//This function validates an array of parameters used in a function call and gives appropriate warnings and errors

	for (var i = 0, iMax = paramsIn.length; i < iMax; i++) {
		if (typeof paramsIn[i] != 'string')
			delete paramsIn[i];
		else {
			if (/^('|")/.test(paramsIn[i])) { //Parameter is a string
				if (paramsIn[i].length == 1 || paramsIn[i][0] != paramsIn[i].slice(-1)) //Parameter is either 1 character long, or has mismatched first and last characters
					script.pushError('Unterminated string literal (' + paramsIn[i] + ')');
				else if (paramsIn[i].length == 2) //Parameter is either '' or ""
					script.pushError('Empty string literals are not allowed');
			}

			if (paramsIn[i].toLowerCase() in script.variables['#local']) {
				//if (!script.variables["#local"][paramsIn[i].toLowerCase()].sets) {
					//script.pushWarning("The variable \"" + paramsIn[i] + "\" has not been assigned a value yet");
				//}
				script.variables['#local'][paramsIn[i].toLowerCase()].checks++;
			}

			if (typeof paramsDef == 'undefined') {
				continue;
			}

			if (i in paramsDef) { //Parameter corresponds with one of the defined parameters for this function

				if (paramsDef[i].deprecated == true) {
					script.pushWarning('The parameter "' + paramsDef[i].name + '" (' + paramsIn[i] + ') is deprecated');
				}

				if (paramsDef[i].values) { //Parameter is only allowed to take one of a set of values
					if (!(paramsIn[i].toLowerCase() in paramsDef[i].values)) {
						with ({stringTemp: 'The parameter "' + paramsDef[i].name + '" (' + paramsIn[i] + ') requires one of the following values: '}) {
							for (var j in paramsDef[i].values) {
								stringTemp += paramsDef[i].values[j] + ', ';
							}
							script.pushError(stringTemp.slice(0, -2));
						}
					}
				}

			} else if (functionName.toLowerCase() in dictionary.functions || functionName.toLowerCase() in dictionary.blocktypes) { //Parameter doesn't correspond with one of the defined parameters for this function
				script.pushError('"' + paramsIn[i] + '" doesn\'t correspond with a parameter of ' + functionName);
			}

			if (/^((\w+\.)?\w+|-?\d*\.?\d+|("|').*)$/.test(paramsIn[i]) == false) { //Not a variable, number or string
				script.pushError((i in paramsDef ? 'The parameter "' + paramsDef[i].name + '" (' + paramsIn[i] + ')' : '"' + paramsIn[i] + '"') + ' is of an unrecognised form');
			} else if (paramsIn[i].toLowerCase() in dictionary.functions) {
				script.pushError((i in paramsDef ? 'The parameter "' + paramsDef[i].name + '" (' + paramsIn[i] + ')' : '"' + paramsIn[i] + '"') + ' is a function');
			} else if (paramsIn[i].toLowerCase() in dictionary.keywords) {
				script.pushError((i in paramsDef ? 'The parameter "' + paramsDef[i].name + '" (' + paramsIn[i] + ')' : '"' + paramsIn[i] + '"') + ' is a keyword');
			} else if (paramsIn[i].toLowerCase() in dictionary.blocktypes) {
				script.pushError((i in paramsDef ? 'The parameter "' + paramsDef[i].name + '" (' + paramsIn[i] + ')' : '"' + paramsIn[i] + '"') + ' is a blocktype');
			}
		}
	}

	if (paramsDef) {
		for (var i = 0, iMax = paramsDef.length; i < iMax; i++) {
			if (i in paramsIn) { //Parameter has been supplied
				continue;
			}

			if (paramsDef[i].optional == false) { //Parameter has not been supplied, but is required
				script.pushError('Missing parameter "' + paramsDef[i].name + '"');
			}
		}
	}
}

function evaluateFunction(functionCall)
{
	//This function validates a function call, complete with any specified calling reference and/or parameters

	var functionName = functionCall.match(/^(\w+\.)?(\w+)/)[2]; //Remove any calling reference

	var callingRef = functionCall.match(/^(\w+)\./); //Get any calling reference
	if (callingRef != null) { //Check calling reference for errors
		callingRef = callingRef[1];
		if (callingRef.toLowerCase() in dictionary.functions) {
			script.pushError('"' + callingRef + '" is a function');
		} else if (callingRef.toLowerCase() in dictionary.keywords) {
			script.pushError('"' + callingRef + '" is a keyword');
		} else if (callingRef.toLowerCase() in dictionary.blocktypes) {
			script.pushError('"' + callingRef + '" is a blocktype');
		} else if (callingRef.toLowerCase() in script.variables['#local']) {
			if (script.variables['#local'][callingRef.toLowerCase()].type != 'ref') {
				script.pushError('Only "ref" variables can be used to call reference functions');
			}
			if (!script.variables['#local'][callingRef.toLowerCase()].sets) {
				script.pushWarning('The variable "' + callingRef + '" has not been assigned a value yet');
			}
			script.variables['#local'][callingRef.toLowerCase()].checks++;
		}
	}

	//If function is undefined, define dummy function that has no calling restrictions
	var functionDef = functionName.toLowerCase() in dictionary.functions ? dictionary.functions[functionName.toLowerCase()] : new scriptFunction("void");

	//If there is a valid parameter list, extract it
	var params
	if (/^(\w+\.)?(\w+)(((\s*,\s*|\s+)?("[^"]*?"|'[^']*?'|[^"';\s,]+))*((\s*,\s*|\s+)?("[^"]*|'[^']*))?)\s*$/.test(functionCall)) {
		params = functionCall.match(/^(\w+\.)?(\w+)(((\s*,\s*|\s+)?("[^"]*?"|'[^']*?'|[^"';\s,]+))*((\s*,\s*|\s+)?("[^"]*|'[^']*))?)\s*$/)[3];
	}

	//Validate parameter separation
	if (functionCall.match(/^(\w+\.)?(\w+)(((\s*,\s*|\s+)("[^"]*?"|'[^']*?'|[^"';\s,]+))*((\s*,\s*|\s+)("[^"]*|'[^']*))?)\s*$/) == null || functionCall.match(/,\s*,/)) {
		script.pushError('Invalid parameter separation.  Function parameters should be separated by whitespace and/or a single comma');
	}

	if (typeof params != 'undefined') {
		//Extract individual parameters into an array
		params = params.match(/"[^"]*?"|'[^']*?'|"[^"]*$|'[^']*$|[^"';\s,]+/g);

		if (params == null) {
			params = [];
		}

		//Validate the parameter array
		evaluateParams(params, functionDef.params, functionName);
	}

	if ('callingConvention' in functionDef) {
		switch (functionDef.callingConvention) {
		case 'R':
			//Called on reference
			if (callingRef == null) { //Called implicitly
				script.scriptType &= 13; //Result, object and effect
			}
			break;
		case 'S':
			//Reference function that should always be called implicitly
			if (callingRef == null) {
				script.scriptType &= 13; //Result, object and effect
			} else {
				script.pushWarning('"' + functionName + '" should always be called implicitly on the scripted reference');
			}
			break;
		case 'E':
			//Called on reference or on base form specified as final parameter - script extender functions only
			if (functionDef.params.length - 1 in params) {
				if (callingRef != null) {
					script.pushWarning('"' + functionName + '" has both a calling reference and a base form specified, but only the base form will be used');
				}
			} else if (callingRef == null) {
				script.scriptType &= 13; //Result, object and effect
			}
			break;
		case 'B':
			//Not called on any base form or reference
			if (callingRef != null) {
				script.pushError('"' + functionName + '" cannot be called on a reference');
			}
			break;
		case 'D':
			//The function is deprecated and should not be called in any way
			script.pushError('"' + functionName + '" is deprecated');
			break;
		};
	}

	//Keep required script extender version updated
	if ('SEVersion' in functionDef) {
		if (functionDef.SEVersion > script.SEVersion) {
			script.SEVersion = functionDef.SEVersion;
		}
	}

	//Report any relevant function notes
	if ('notes' in functionDef) {
		for (var i = 0, iMax = functionDef.notes.length; i < iMax; i++) {
			if (functionDef.notes[i].condition([callingRef].concat(params)) == true) { //This is how the condition of a scriptFunctionNote should be evaluated
				switch (functionDef.notes[i].level) {
				case 0:
					script.pushWarning(functionDef.notes[i].content);
					break;
				case 1:
					script.pushError(functionDef.notes[i].content);
					break;
				}
			}
		}
	}

	return functionDef.returnType;
}

function evaluateToken(token)
{
	//This function validates a single token, which may be a number, variable or function call, and returns a type identifier (currently only ' #unknown ' or ' #ref ')
	//The variable script.isValid is used to also return the number of invalid expression fragments

	var functionName = token.replace(/^(\w+\.)?(\w+)((\s*,\s*|\s+)("[^"]*?"|'[^']*?'|(\w+\.)?\w+))*/, '$2'); //Extract possible function name

	if (/^\s*#\w+\s+\w/.test(token) == true) { //Evaluated sub-expression now appears as function call, meaning there is an invalid expression fragment such as (x+y) z
		script.isValid++;
	} else if (functionName.toLowerCase() in dictionary.keywords) {
		script.pushError('"' + functionName + '" is a keyword');
		return ' #unknown ';
	} else if (functionName.toLowerCase() in dictionary.functions) {
		if (evaluateFunction(token) == 'void') {
			script.pushError('"' + functionName + '" has no return value');
		}
	} else if (functionName.toLowerCase() in script.variables['#local']) {
		//if (!script.variables['#local'][functionName.toLowerCase()].sets)
			//script.pushWarning('The variable "' + functionName + '" has not been assigned a value yet');
		script.variables['#local'][functionName.toLowerCase()].checks++;
	} else if (/^('|")/.test(functionName)) {
		script.pushError('String literals cannot be used in expressions except as function parameters');
	} else if (/\d*\.?\d+/.test(functionName) == false) {
		//May be editorID, so check for parameters
		with ({params: token.match(/^(\w+\.)?(\w+)(((\s*,\s*|\s+)?(".*?"|'.*?'|[^"';\s,]+))*((\s*,\s*|\s+)?("[^"]*|'[^']*))?)\s*$/)}) {
			if (params != null) {
				params = params[3];
				if (params == '.') {
					script.pushError('A period must be followed by a reference function or variable name');
				} else if (params.match(/"[^"]*?"|'[^']*?'|"[^"]*$|'[^']*$|[^"';\s,]+/g))
					script.pushError('Unknown function "' + token.match(/^(\w+\.)?(\w+)/)[2] + '"');
				else if (/^\w+\./.test(token)) { //Could be remote variable
					with ({callingRef: token.match(/^(\w+)\./)[1]}) {
						if (callingRef.toLowerCase() in dictionary.keywords) {
							script.pushError('"' + callingRef + '" is a keyword');
							return ' #unknown ';
						} else if (callingRef.toLowerCase() in dictionary.functions) {
							script.pushError('"' + callingRef + '" is a function, and cannot be used to call another function or for remote variable access');
							return ' #unknown ';
						} else if (callingRef.toLowerCase() in script.variables['#local']) {
							if (script.variables['#local'][callingRef.toLowerCase()].type == 'ref') {
								script.pushError('Unknown function "' + token.match(/^\w+\.(\w+)/)[1] + '"');
							} else {
								script.pushError('Unknown function "' + token.match(/^\w+\.(\w+)/)[1] + '"');
								script.pushError('Only "ref" variables can be used to call reference functions, and variables cannot be used for remote variable access');
							}
						} else if (callingRef.toLowerCase() in script.variables['#global']) {
							script.pushError('Unknown function "' + token.match(/^\w+\.(\w+)/)[1] + '"');
							script.pushError('Global variables cannot be used for remote variable access or to call reference functions');
						} else {
							if (!(callingRef.toLowerCase() in script.editorIDs)) {
								script.editorIDs[callingRef.toLowerCase()] = new editorID('ref');
							}
							if (!((callingRef.toLowerCase() + '.' + token.match(/^\w+\.(\w+)/)[1].toLowerCase()) in script.variables['#external'])) {
								script.variables['#external'][callingRef.toLowerCase() + "." + token.match(/^\w+\.(\w+)/)[1].toLowerCase()] = new variable(token.match(/^\w+\.(\w+)/)[1]);
							}
							return ' #ref ';
						}
					}
					return ' #ref ';
				}
			}
		}
		if (/^(\w+\.)?\w+/.test(token)) {
			evaluateFunction(token);
		}
	}

	return ' #ref ';
}

function evaluateSubExpression(expression)
{
	//This function validates a simple expression that has no nested (i.e. bracketed) expressions by splitting them into individual operations

	var findToken = '(\\s*-?\\s*#?[\\s\\w".,]*[\\w".]\\s*)';
	var leftToken, operator, rightToken;

	var bedmas = [new RegExp(findToken + '\\s*(\\*|\\/|%)\s*' + findToken), new RegExp('\\s*' + findToken + '\\s*(-|\\+)\\s*' + findToken), new RegExp(findToken + '\\s*(<|<=|>|>=|==|!=)\\s*' + findToken), new RegExp(findToken + '\\s*(\\|\\|)\\s*' + findToken), new RegExp(findToken + '\\s*(&&)\s*' + findToken)];

	var isValid = 0; //Used to check whether or not there is a problem with the expression
	//It is named after script.isValid, which is used as a dummy variable to pass this information out of the function

	if (/(^|\s)\.[^\s\D]*\D/.test(expression) == true) { //A token starting with a dot that is not a number
		script.isValid++;
		isValid++;
		expression = expression.replace(/(^|\s)\./g, '$1');
	}

	for (var i = 0, iMax = bedmas.length; i < iMax; i++) {
		while (bedmas[i].test(expression) == true) {
			leftToken = trim(expression.match(bedmas[i])[1]);
			operator = expression.match(bedmas[i])[2];
			rightToken = trim(expression.match(bedmas[i])[3]);

			//Check type identifiers of left and right tokens
			if (/^#\w+$/.test(leftToken) == false) {
				evaluateToken(leftToken);
			}
			if (/^#\w+$/.test(rightToken) == false) {
				evaluateToken(rightToken);
			}

			expression = expression.replace(bedmas[i], ' #ref ');
		}
	}

	if (!isValid && (/^(\s*[^\s-][^\w\s#".]+)|^(\s*\.\D+\s)|(\s*[^\w\s#"]+)$/.test(expression) == true)) {
		script.pushError('Expression cannot begin or end with an operator');
		expression = expression.replace(/^(\s*[^\w\s#"]+)*\s*(.*)(\s*[^\w\s#"]+)*\s*$/g, '$2');
	}
	if (!isValid && /[^\w\s]\s*[^\w\s]/.test(expression) == true) {
		script.isValid++;
		isValid++;
		expression = expression.replace(/([^\w\s])(\s*[^\w\s])*/g, '$1');
	}
	if (/#/.test(expression) == false) {
		expression = evaluateToken(trim(expression));
	}

	return expression;
}

function evaluateExpressionBrackets(expression)
{
	//This function takes a whole expression that may or may not have nested (i.e. bracketed) expressions, and evaluates them each in turn

	var findBrackets = /\(([^()]*)\)|{([^{}]*)}|\[([^\[\]]*)\]/;

	while (findBrackets.test(expression) == true) {
		expression = expression.replace(findBrackets, evaluateExpressionBrackets(expression.match(findBrackets)[1] || expression.match(findBrackets)[2] || expression.match(findBrackets)[3]));
	}
	if (typeof expression == 'undefined') {
		script.pushError('Empty brackets illegal in an expression');
		return ' #undefined ';
	}

	//Check for mismatched brackets (all sub-expressions nested in brackets should have been evaluated)
	findBrackets = expression.match(/\(|{|\[/g);
	if (findBrackets) {
		script.pushError(findBrackets.length + ' mismatched opening bracket' + (findBrackets.length == 1 ? '' : 's'));
		expression = expression.replace(findBrackets, '');
	}
	findBrackets = expression.match(/\)|}|\]/g);
	if (findBrackets) {
		script.pushError(findBrackets.length + ' mismatched closing bracket' + (findBrackets.length == 1 ? '' : 's'));
		expression = expression.replace(findBrackets, '');
	}

	//Evaluate innermost expression
	return evaluateSubExpression(expression);
}

function validateExpression(expression)
{
	//This function takes a whole expression and runs some simple validity checks.  If it passes these checks, the expression is validated further
	//The variable script.isValid is used to also return the number of invalid expression fragments

	script.isValid = 0;

	if (!/^(('[^']*?'|"[^"]*?")*[^'"]*)*$/.test(expression)) {
		script.pushError('Expression contains unterminated string literals');
	}

	if (/[@#$^?:\\]/.test(expression) == true) {
		script.pushError('Expression contains invalid character');
	} else if (/^('|")/.test(expression)) {
		script.pushError('Expression starts with a string');
	} else {
		if (/=!/.test(expression) == true) {
			script.pushError('Invalid operator "=!".  Use "!=" for "is not equal to"');
		} else if (/=>/.test(expression) == true) {
			script.pushError('Invalid operator "=>".  Use ">=" for "greater than or equal to"');
		} else if (/=</.test(expression) == true) {
			script.pushError('Invalid operator "=<".  Use "<=" for "less than or equal to"');
		}
		if (/(^|[^!=<>])=(?!=)/.test(expression.replace(/=!|=>|=</g, '')) == true) {
			script.pushError('The "=" assignment operator is not permitted.  Use "set" for assignment, or "==" for comparison');
		} else if (/(^|[^&])&(?!&)|(^|[^|])\|(?!\|)/.test(expression == true)) {
			script.pushError('"&amp;" and "|" may only be used as "&amp;&amp;" or "||"');
		} else {
			evaluateExpressionBrackets(expression);
		}
	}

	if (script.isValid) {
		script.pushError(script.isValid + ' invalid expression fragment' + (script.isValid == 1 ? '' : 's'));
	}
}

function validateScript(inputElement, outputElement, extraDataElement)
{
	try {
		script = {
			lineNumber: 0,
			totalLineNumberCount: 0,

			hasScriptName: 0,
				//0 - No ScriptName
				//1 - Has ScriptName
				//2 - Has valid code but no ScriptName
			scriptType: 15,
				//Each bit represents a script type:
				//effect object quest result
				//i.e. 15 is 1 1 1 1

			SEVersion: 0,

			inBlock: '',
			blockNumber: 0,
			conditionalLevel: 0,
			elseDone: [],
			indentIncrement: 0,

			isValid: new Boolean(false),

			variables: {},
			editorIDs: {},

			labels: [],

			errors: [],
			warnings: [],
			input: trim(inputElement.val ? inputElement.val() : inputElement.html()).split(/\n|<br\/?>/i),
			output: [],

			pushError: function (string) {this.errors[this.lineNumber].push(string);},

			pushWarning: function (string) {this.warnings[this.lineNumber].push(string);},

			indent: function (line)
			{
				if (line != '') {
					for (var i = this.conditionalLevel + this.indentIncrement + (this.inBlock != ''); i > 0; i--)
						line = '\t' + line;
				}

				this.indentIncrement = 0;

				return line;
			}
		};

		script.variables['#local'] = {};
		script.variables['#global'] = {};
		script.variables['#external'] = {};

		var firstWord;
		var line;
		var comment;

		for (script.lineNumber in script.input) {
			line = trim(script.input[script.lineNumber]).match(/^(([^;'"]*|"[^"]*?("|$)|'[^']*?('|$))*)((\s*(;(.*))?)$)?/);
			comment = line[5];
			line = line[1];

			script.errors[script.lineNumber] = [];
			script.warnings[script.lineNumber] = [];

			if (!line.length) {
				script.output[script.lineNumber] = (typeof comment == 'undefined' ? '' : '<span class="comment">' + HTMLEntityConvert(script.indent(comment)).replace(comment, '<span>' + comment + '</span>') + '</span>');
				continue;
			}

			firstWord = line.toLowerCase().match(/^\s*(\w+)?\s*/)[1];
			if (firstWord in dictionary.keywords) {
				if ('non_contextual_errors' in dictionary.keywords[firstWord]) {
					for (var error in dictionary.keywords[firstWord].non_contextual_errors) { //Non-contextual error checking
						if (dictionary.keywords[firstWord].non_contextual_errors[error].test(line.replace(/^\s*(\w+)?\s*/, '')) == true) {
							script.pushError(error);
							break;
						}
					}
				}

				if (!(0 in script.errors[script.lineNumber])) {
					script.errors[script.lineNumber] = ['Unknown error'];
					script.isValid = false;
				} else {
					script.isValid = script.errors[script.lineNumber][0] == "" ? true : false;
				}

				if ('contextual_validate' in dictionary.keywords[firstWord]) {
					dictionary.keywords[firstWord].contextual_validate(script);
				}

				if (!script.hasScriptName && line != '' && line.indexOf(';')) {
					script.hasScriptName = 2;
				}
			} else if (firstWord) { //Has firstWord but not defined keyword, assume function call
				if (/^\s*(\w+\.)?([^\d\W]\w*)/.test(line) == true) {
					firstWord = line.match(/^\s*(\w+\.)?([^\d\W]\w*)/)[2];
					if (firstWord.toLowerCase() in dictionary.functions) {
						if (evaluateFunction(line.match(/^\s*(((\w+\.)?[^\d\W]\w*.*))$/)[1]) != 'void')
							script.pushWarning('"' + firstWord + '" has a return value that is not being used');
					} else if (firstWord.toLowerCase() in script.variables['#local'] || firstWord.toLowerCase() in script.variables['#global']) {
						script.pushWarning('Line has no use and should be commented out or removed');
						validateExpression(line);
					} else if (firstWord.toLowerCase() in dictionary.blocktypes) {
						script.pushError('"' + firstWord + '" is a blocktype, but is being used as a function');
					} else if (/^\s*(\w+\.)([^\d\W]\w*)/.test(line)) {
						with ({callingRef: line.match(/^\s*(\w+)\.([^\d\W]\w*)/)[1].toLowerCase()}) {
							if (callingRef in script.variables['#local']) {
								script.pushError('Unknown function "' + firstWord + '"');
								evaluateFunction(line.match(/^\s*(((\w+\.)[^\d\W]\w*.*))$/)[1]);
							} else if (callingRef in script.variables['#global']) {
								script.pushError('Unknown function or variable "' + firstWord + '"');
								script.pushError('Global variables cannot be used as "ref" variables');
								evaluateFunction(line.match(/^\s*(((\w+\.)[^\d\W]\w*.*))$/)[1]);
							} else if (line.match(/^\s*\w+\.[^\d\W]\w*[,\s]+[^,\s]/)) { //Has parameters
								if (!(callingRef in script.editorIDs)) {
									script.editorIDs[callingRef] = new editorID("ref");
								}
								script.pushError('Unknown function "' + firstWord + '"');
								evaluateFunction(line.match(/^\s*(((\w+\.)[^\d\W]\w*.*))$/)[1]);
							} else { //Remote variable
								if (!(callingRef in script.editorIDs)) {
									script.editorIDs[callingRef] = new editorID("ref");
								}
								script.variables['#external'][callingRef + '.' + firstWord] = new variable(firstWord);
								script.pushWarning('Line has no use and should be commented out or removed');
							}
						}
					} else {
						script.pushWarning('Line has no use and should be commented out or removed');
						validateExpression(line);
					}
				} else {
					script.pushWarning('Line has no use and should be commented out or removed');
					validateExpression(line);
				}
			} else if (line.length) {
				script.pushWarning('Line has no use and should be commented out or removed');
				validateExpression(line);
			}

			script.output[script.lineNumber] = highlight(script.indent(line)) + (typeof comment == 'undefined' ? '' : '<span class="comment">' + comment + '</span>');
		}

		if (script.inBlock != '') {
			script.pushError('Missing End statement');
		}
		if (script.conditionalLevel) {
			script.pushError(script.conditionalLevel + ' missing endif statement' + (script.conditionalLevel > 1 ? 's' : ''));
		}

		for (var varIndex in script.variables['#local']) {
			if (!script.variables['#local'][varIndex].sets) {
				script.pushWarning('The local variable "' + script.variables['#local'][varIndex].varName + '" was never assigned a value in this script');
			}
			if (!script.variables['#local'][varIndex].checks) {
				script.pushWarning('The value of the local variable "' + script.variables['#local'][varIndex].varName + '" was never used in this script');
			}
		}

		for (script.lineNumber = 0, script.totalLineNumberCount = script.output.length; script.lineNumber < script.totalLineNumberCount; script.lineNumber++) {
			errorList = '';
			if (script.errors[script.lineNumber].length > (script.errors[script.lineNumber][0] == '') || script.warnings[script.lineNumber].length) {
				errorList = '<span class="icon ' + (script.warnings[script.lineNumber].length ? ((script.errors[script.lineNumber].length > (script.errors[script.lineNumber][0] == '')) ? 'errorIcon ' : '') + 'warningIcon' : 'errorIcon') + '"><ul id="errorLine' + (+script.lineNumber + 1) + '" class="errorLine">';
				for (var errorNumber = 0, errorNumberMax = script.errors[script.lineNumber].length; errorNumber < errorNumberMax; errorNumber++) {
					if (script.errors[script.lineNumber][errorNumber] != '') {
						errorList += '<li class="error">' + HTMLEntityConvert(script.errors[script.lineNumber][errorNumber]) + '</li>';
					}
				}
				for (var warningNumber = 0, warningNumberMax = script.warnings[script.lineNumber].length; warningNumber < warningNumberMax; warningNumber++) {
					if (script.warnings[script.lineNumber][warningNumber] != '') {
						errorList += '<li class="warning">' + HTMLEntityConvert(script.warnings[script.lineNumber][warningNumber]) + '</li>';
					}
				}
				errorList += '</ul></span>';
			} else {
				errorList = '<span class="icon"></span>';
			}

			script.output[script.lineNumber] = '<span id="outputLine' + (+script.lineNumber + 1) + '" class="outputLine">' + errorList + script.output[script.lineNumber] + '</span><br />';
		}

		outputElement.html('<pre>' + script.output.join('') + '</pre>');

		script.errors = '\n\nScript may be of type ';
		for (var power = 0; power < 4; power++) {
			if (script.scriptType & Math.pow(2, power)) {
				script.errors += scriptTypes[power] + ' or ';
			}
		}
		script.errors = script.errors.slice(0, -4) + '.';

		if (script.SEVersion) {
			with ({version: Math.floor(script.SEVersion * 10) / 10, beta: Math.floor((script.SEVersion - (Math.floor(script.SEVersion * 10) / 10)) * 100)}) {
				script.errors += '<br />This script requires ' + ($('#game-newvegas').is(':checked') ? 'NVSE' : 'FOSE') + 'v' + version + (beta ? ' beta' + beta : '');
				if ($('#game-newvegas').is(':checked')) {
					script.errors += '<br />NOTE: Currently, the NVSE function library is a direct copy of the FOSE function library';
				}
			}
		}

		if (extraDataElement) {
			extraDataElement.html(script.errors);
		}

		$('.icon').hover(function () {$(this).children('ul').toggle();});
		$('.functionInfoWrapper').hover(function () {if ($('#tooltips').is(':checked')) {$(this).children('.functionInfo').toggle();}});
	} catch(e) {
		outputElement.html('<span style="color: red;">' + e.toString() + (typeof e.fileName != "undefined" ? '<br />' + e.fileName + ' line ' + e.lineNumber : '') + '<br />Please <a href="http://code.google.com/p/fallout-script-validator/issues/entry">report</a> this error.</span>');
	}
}