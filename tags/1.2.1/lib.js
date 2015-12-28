/*This file contains various useful JavaScript functions, most of which are unrelated in function
Copyright (C) 2010 Mark Hanna, a.k.a. Cipscis

This code is free software: you can redistribute it and/or modify it under the terms of the GNU General Public LIcense as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This code is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

See http://www.gnu.org/licenses/ for a copy of the GNU General Public License
*/

//Remove whitespace from start and end of a string
function trim(string) { return string.replace(/^\s+|\s+$/g , ''); }

//Convert special characters to their corresponding HTML entities
function HTMLEntityConvert(string) { return string.replace(/&/g, '&#38;').replace(/</g, '&#60;').replace(/>/g, '&#62;').replace(/"/g, '&#34;').replace(/'/g, '&#39;'); }

function combineObjects(objectArray)
{
	//Creates a new object with all the properties of the objects in the
	//input array.  If multiple objects have properties of the same name,
	//objects later in the array will take precedence.

	//If only one object is in the array, a shallow copy will be created

	var output = {};
	for (var i in objectArray) {
		for (var j in objectArray[i])
			output[j] = objectArray[i][j];
	}
	return output;
}

function selectElement(element) {
	//Selects the content of an HTML element
	//For example, element = document.getElementById('output');

	if (document.selection) { //IE
		document.selection.empty();
		var range = document.body.createTextRange();
		range.moveToElementText(element);
		range.select();
	} else if (window.getSelection) {
		var range = document.createRange();
		range.selectNode(element);
		window.getSelection().addRange(range);
	}
}

///////////////////////////////////
//These functions require jQuery://
///////////////////////////////////

var toggleClass = function(identifier, className) {
	if (typeof jQuery != 'undefined') {
		var elements = $(identifier);
		if (!elements.hasClass(className))
			elements.addClass(className);
		else
			elements.removeClass(className);
	} else
		alert('Error: jQuery is not loaded');
}