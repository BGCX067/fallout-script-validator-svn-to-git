function highlight(string)
{
	//Apply span with appropriate class to different types of keywords and functions, as well as strings and variables, and add documentation links where appropriate

	string = string.match(/("|').*?(\1|$)|[^"']+/g); //Separate string literals from the rest of the input string
	for (var i = 0, iMax = string.length; i < iMax; i++) {
		if (/^("|')/.test(string[i])) { //String
			string[i] = '<span class="string">' + HTMLEntityConvert(string[i]) + '</span>';
		} else if (typeof string[i] != 'string') {
			delete string[i];
		} else {
			string[i] = string[i].split(/\b/);
			for (var j = 0, jMax = string[i].length; j < jMax; j++) { //Loop through words in substrings

				//Keywords
				if (string[i][j].toLowerCase() in dictionary.keywords) {

					var keywordName = string[i][j];
					var keywordDef = dictionary.keywords[keywordName.toLowerCase()];

					//Change keyword in output if any of the relevant options are checked
					if ($('#nameType-short').is(':checked') && keywordDef.shortName) {
						keywordName = keywordDef.shortName;
					} else if ($('#nameType-long').is(':checked') && keywordDef.longName) {
						keywordName = keywordDef.longName;
					} else if ($('#fixCaps').is(':checked') && keywordDef.name) {
						keywordName = keywordDef.name;
					}

					string[i][j] = '<span class="keyword' + (keywordDef.type) + '">' + keywordName + '</span>';

				//Functions
				} else if (string[i][j].toLowerCase() in dictionary.functions) {

					var functionName = string[i][j];
					var functionDef = dictionary.functions[functionName.toLowerCase()];

					//Change function name in output if any of the relevant options are checked
					if ($('#nameType-short').is(':checked') && functionDef.shortName) {
						functionName = functionDef.shortName;
					} else if ($('#nameType-long').is(':checked') && functionDef.longName) {
						functionName = functionDef.longName;
					} else if ($('#fixCaps').is(':checked') && functionDef.name) {
						functionName = functionDef.name;
					}

					var functionDoc = functionDef.returnType + ' ' + (/R|E/.test(functionDef.callingConvention) ? '[ref].' : '') + '<span class="' + (functionDef.SEVersion ? 'ScriptExtender' : 'GECK') + 'Function">' + (functionDef.longName || functionDef.name) + (functionDef.shortName ? '</span>|<span class="' + (functionDef.SEVersion ? 'ScriptExtender' : 'GECK') + 'Function">' + functionDef.shortName : '') + '</span>';
					if (functionDef.params) {
						for (var k = 0, kMax = functionDef.params.length; k < kMax; k++) {
							functionDoc += ' ' + (functionDef.params[k].optional ? '<span class="OptionalParam">' : '') + functionDef.params[k].name + ':' + functionDef.params[k].dataType;
							if (functionDef.params[k].values) {
								functionDoc += '{';
								for (var l in functionDef.params[k].values) {
									functionDoc += functionDef.params[k].values[l] + ', ';
								}
								functionDoc = functionDoc.slice(0, -2) + '}';
							}
							functionDoc += (functionDef.params[k].optional ? '</span>' : '');
						}
					}

					string[i][j] = (typeof functionDef.docLink == 'undefined' ? '<span' : '<a href="' + functionDef.docLink + '"') +' class="' + (functionDef.SEVersion ? 'ScriptExtender' : 'GECK') + 'Function">' +
					'<span class="functionInfoWrapper"><span class="functionInfo">' + functionDoc + '</span>' + functionName + '</span>' +
					(typeof functionDef.docLink == 'undefined' ? '</span>' : '</a>');

				//Blocktypes
				} else if (string[i][j].toLowerCase() in dictionary.blocktypes) {

					string[i][j] = (typeof dictionary.blocktypes[string[i][j].toLowerCase()].docLink == 'undefined' ? '<span' : '<a href="' + dictionary.blocktypes[string[i][j].toLowerCase()].docLink + '"') + ' class="keyword1">' +
					($('#fixCaps').is(':checked') ? dictionary.blocktypes[string[i][j].toLowerCase()].name : string[i][j]) +
					(typeof dictionary.blocktypes[string[i][j].toLowerCase()].docLink == 'undefined' ? '</span>' : '</a>');

				//Local variables
				} else if ((string[i][j].toLowerCase() in script.variables['#local'])) {

					if ((j - 1) in string[i]) { //There is a previous word in the string
						if (string[j - 1] != '.') {
							string[i][j] = '<span class="keyword2"><span class="functionInfoWrapper"><span class="functionInfo">' + script.variables['#local'][string[i][j].toLowerCase()].type + ' ' + script.variables['#local'][string[i][j].toLowerCase()].varName + '</span>' +
							($('#fixCaps').is(':checked') ? script.variables['#local'][string[i][j].toLowerCase()].varName : string[i][j]) +
							'</span></span>';
						}
					} else { //The variable is being accessed with explicit variable syntax, and is likely not a local variable
						string[i][j] = '<span class="keyword2">' +
						($('#fixCaps').is(':checked') ? script.variables['#local'][string[i][j].toLowerCase()].varName : string[i][j]) +
						'</span>';
					}

				//Global variables
				} else if ((string[i][j].toLowerCase() in script.variables['#global'])) {
					if ((j - 1) in string[i]) {
						if (string[j - 1] != '.') {
							string[i][j] = '<span class="keyword2">' +
							($('#fixCaps').is(':checked') ? script.variables['#global'][string[i][j].toLowerCase()].varName : string[i][j]) +
							'</span>';
						}
					} else {
						string[i][j] = '<span class="keyword2">' +
						($('#fixCaps').is(':checked') ? script.variables['#global'][string[i][j].toLowerCase()].varName : string[i][j]) +
						'</span>';
					}

				//Indentation
				} else if (/\t/.test(string[i][j])) {
					string[i][j] = '<span class="indentation">' + string[i][j] + '</span>';
				} else {
					string[i][j] = HTMLEntityConvert(string[i][j]);
				}

			}
			string[i] = string[i].join('');
		}
	}

	return string.join('');
}