"use strict";
self["webpackHotUpdate_N_E"]("webpack",{},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/create fake namespace object */
/******/ (() => {
/******/ 	var getProto = Object.getPrototypeOf ? (obj) => (Object.getPrototypeOf(obj)) : (obj) => (obj.__proto__);
/******/ 	var leafPrototypes;
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 16: return value when it's Promise-like
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = this(value);
/******/ 		if(mode & 8) return value;
/******/ 		if(typeof value === 'object' && value) {
/******/ 			if((mode & 4) && value.__esModule) return value;
/******/ 			if((mode & 16) && typeof value.then === 'function') return value;
/******/ 		}
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		var def = {};
/******/ 		leafPrototypes = leafPrototypes || [null, getProto({}), getProto([]), getProto(getProto)];
/******/ 		for(var current = mode & 2 && value; typeof current == 'object' && !~leafPrototypes.indexOf(current); current = getProto(current)) {
/******/ 			Object.getOwnPropertyNames(current).forEach((key) => (def[key] = () => (value[key])));
/******/ 		}
/******/ 		def['default'] = () => (value);
/******/ 		__webpack_require__.d(ns, def);
/******/ 		return ns;
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/get javascript chunk filename */
/******/ (() => {
/******/ 	// This function allow to reference async chunks
/******/ 	__webpack_require__.u = (chunkId) => {
/******/ 		// return url for filenames based on template
/******/ 		return "static/chunks/" + chunkId + ".js";
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/get mini-css chunk filename */
/******/ (() => {
/******/ 	// This function allow to reference async chunks
/******/ 	__webpack_require__.miniCssF = (chunkId) => {
/******/ 		// return url for filenames based on template
/******/ 		return "static/css/" + chunkId + ".css";
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("d15307a9d6af3038")
/******/ })();
/******/ 
/******/ /* webpack/runtime/css loading */
/******/ (() => {
/******/ 	var createStylesheet = (chunkId, fullhref, resolve, reject) => {
/******/ 		var linkTag = document.createElement("link");
/******/ 	
/******/ 		linkTag.rel = "stylesheet";
/******/ 		linkTag.type = "text/css";
/******/ 		var onLinkComplete = (event) => {
/******/ 			// avoid mem leaks.
/******/ 			linkTag.onerror = linkTag.onload = null;
/******/ 			if (event.type === 'load') {
/******/ 				resolve();
/******/ 			} else {
/******/ 				var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 				var realHref = event && event.target && event.target.href || fullhref;
/******/ 				var err = new Error("Loading CSS chunk " + chunkId + " failed.\n(" + realHref + ")");
/******/ 				err.code = "CSS_CHUNK_LOAD_FAILED";
/******/ 				err.type = errorType;
/******/ 				err.request = realHref;
/******/ 				linkTag.parentNode.removeChild(linkTag)
/******/ 				reject(err);
/******/ 			}
/******/ 		}
/******/ 		linkTag.onerror = linkTag.onload = onLinkComplete;
/******/ 		linkTag.href = fullhref;
/******/ 	
/******/ 		(function(linkTag) {
/******/ 		                if (typeof _N_E_STYLE_LOAD === 'function') {
/******/ 		                    // Avoid destructuring and optional-chaining here: this function
/******/ 		                    // is serialized as a string by mini-css-extract-plugin and
/******/ 		                    // injected directly into the browser bundle without further
/******/ 		                    // transpilation. Destructuring (`const { x } = obj`) breaks on
/******/ 		                    // browsers that pre-date ES2015 support (e.g. Chrome <49).
/******/ 		                    var href = linkTag.href;
/******/ 		                    var onload = linkTag.onload;
/******/ 		                    var onerror = linkTag.onerror;
/******/ 		                    _N_E_STYLE_LOAD(href.indexOf(window.location.origin) === 0 ? new URL(href).pathname : href).then(function() {
/******/ 		                        if (onload) onload.call(linkTag, {
/******/ 		                            type: 'load'
/******/ 		                        });
/******/ 		                    }, function() {
/******/ 		                        if (onerror) onerror.call(linkTag, {});
/******/ 		                    });
/******/ 		                } else {
/******/ 		                    document.head.appendChild(linkTag);
/******/ 		                }
/******/ 		            })(linkTag)
/******/ 		return linkTag;
/******/ 	};
/******/ 	var findStylesheet = (href, fullhref) => {
/******/ 		var existingLinkTags = document.getElementsByTagName("link");
/******/ 		for(var i = 0; i < existingLinkTags.length; i++) {
/******/ 			var tag = existingLinkTags[i];
/******/ 			var dataHref = tag.getAttribute("data-href") || tag.getAttribute("href");
/******/ 			if(tag.rel === "stylesheet" && (dataHref === href || dataHref === fullhref)) return tag;
/******/ 		}
/******/ 		var existingStyleTags = document.getElementsByTagName("style");
/******/ 		for(var i = 0; i < existingStyleTags.length; i++) {
/******/ 			var tag = existingStyleTags[i];
/******/ 			var dataHref = tag.getAttribute("data-href");
/******/ 			if(dataHref === href || dataHref === fullhref) return tag;
/******/ 		}
/******/ 	};
/******/ 	var loadStylesheet = (chunkId) => {
/******/ 		return new Promise((resolve, reject) => {
/******/ 			var href = __webpack_require__.miniCssF(chunkId);
/******/ 			var fullhref = __webpack_require__.p + href;
/******/ 			if(findStylesheet(href, fullhref)) return resolve();
/******/ 			createStylesheet(chunkId, fullhref, resolve, reject);
/******/ 		});
/******/ 	}
/******/ 	// object to store loaded CSS chunks
/******/ 	var installedCssChunks = {
/******/ 		"webpack": 0
/******/ 	};
/******/ 	
/******/ 	__webpack_require__.f.miniCss = (chunkId, promises) => {
/******/ 		var cssChunks = {"_app-pages-browser_app_myspace_client_tsx":1,"_app-pages-browser_app_cowork_tsx":1,"_app-pages-browser_app_profile-screen_tsx":1,"_app-pages-browser_app_chat-rich-text_tsx":1,"_app-pages-browser_app_chat-agent-plan-view_tsx":1,"_app-pages-browser_app_ui-library-screen_tsx":1,"_app-pages-browser_app_evo-ui-kit_bottom-sheet-demo_tsx":1,"_app-pages-browser_app_evolingo-cards-demo_tsx":1,"_app-pages-browser_app_evolingo-buttons-v2_tsx":1,"_app-pages-browser_app_evolingo-design-system-demo_tsx":1,"_app-pages-browser_app_evolingo-icons-demo_tsx":1,"_app-pages-browser_app_evolingo-ai-components-demo_tsx":1,"_app-pages-browser_app_evolingo-menus-demo_tsx":1};
/******/ 		if(installedCssChunks[chunkId]) promises.push(installedCssChunks[chunkId]);
/******/ 		else if(installedCssChunks[chunkId] !== 0 && cssChunks[chunkId]) {
/******/ 			promises.push(installedCssChunks[chunkId] = loadStylesheet(chunkId).then(() => {
/******/ 				installedCssChunks[chunkId] = 0;
/******/ 			}, (e) => {
/******/ 				delete installedCssChunks[chunkId];
/******/ 				throw e;
/******/ 			}));
/******/ 		}
/******/ 	};
/******/ 	
/******/ 	var oldTags = [];
/******/ 	var newTags = [];
/******/ 	var applyHandler = (options) => {
/******/ 		return { dispose: () => {
/******/ 			for(var i = 0; i < oldTags.length; i++) {
/******/ 				var oldTag = oldTags[i];
/******/ 				if(oldTag.parentNode) oldTag.parentNode.removeChild(oldTag);
/******/ 			}
/******/ 			oldTags.length = 0;
/******/ 		}, apply: () => {
/******/ 			for(var i = 0; i < newTags.length; i++) newTags[i].rel = "stylesheet";
/******/ 			newTags.length = 0;
/******/ 		} };
/******/ 	}
/******/ 	__webpack_require__.hmrC.miniCss = (chunkIds, removedChunks, removedModules, promises, applyHandlers, updatedModulesList) => {
/******/ 		applyHandlers.push(applyHandler);
/******/ 		chunkIds.forEach((chunkId) => {
/******/ 			var href = __webpack_require__.miniCssF(chunkId);
/******/ 			var fullhref = __webpack_require__.p + href;
/******/ 			var oldTag = findStylesheet(href, fullhref);
/******/ 			if(!oldTag) return;
/******/ 			promises.push(new Promise((resolve, reject) => {
/******/ 				var tag = createStylesheet(chunkId, fullhref, () => {
/******/ 					tag.as = "style";
/******/ 					tag.rel = "preload";
/******/ 					resolve();
/******/ 				}, reject);
/******/ 				oldTags.push(oldTag);
/******/ 				newTags.push(tag);
/******/ 			}));
/******/ 		});
/******/ 	}
/******/ })();
/******/ 
/******/ }
)
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJpZ25vcmVMaXN0IjpbMF0sIm1hcHBpbmdzIjoiQUFBQSIsInNvdXJjZXMiOlsid2VicGFjay1pbnRlcm5hbDovL25leHRqcy93ZWJwYWNrLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIFRoaXMgc291cmNlIHdhcyBnZW5lcmF0ZWQgYnkgTmV4dC5qcyBiYXNlZCBvZmYgb2YgdGhlIGdlbmVyYXRlZCBXZWJwYWNrIHJ1bnRpbWUuXG4vLyBUaGUgbWFwcGluZ3MgYXJlIGluY29ycmVjdC5cbi8vIFRvIGdldCB0aGUgY29ycmVjdCBsaW5lL2NvbHVtbiBtYXBwaW5ncywgdHVybiBvZmYgc291cmNlbWFwcyBpbiB5b3VyIGRlYnVnZ2VyLlxuXG5zZWxmW1wid2VicGFja0hvdFVwZGF0ZV9OX0VcIl0oXCJ3ZWJwYWNrXCIse30sXG4vKioqKioqLyBmdW5jdGlvbihfX3dlYnBhY2tfcmVxdWlyZV9fKSB7IC8vIHdlYnBhY2tSdW50aW1lTW9kdWxlc1xuLyoqKioqKi8gLyogd2VicGFjay9ydW50aW1lL2NyZWF0ZSBmYWtlIG5hbWVzcGFjZSBvYmplY3QgKi9cbi8qKioqKiovICgoKSA9PiB7XG4vKioqKioqLyBcdHZhciBnZXRQcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZiA/IChvYmopID0+IChPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqKSkgOiAob2JqKSA9PiAob2JqLl9fcHJvdG9fXyk7XG4vKioqKioqLyBcdHZhciBsZWFmUHJvdG90eXBlcztcbi8qKioqKiovIFx0Ly8gY3JlYXRlIGEgZmFrZSBuYW1lc3BhY2Ugb2JqZWN0XG4vKioqKioqLyBcdC8vIG1vZGUgJiAxOiB2YWx1ZSBpcyBhIG1vZHVsZSBpZCwgcmVxdWlyZSBpdFxuLyoqKioqKi8gXHQvLyBtb2RlICYgMjogbWVyZ2UgYWxsIHByb3BlcnRpZXMgb2YgdmFsdWUgaW50byB0aGUgbnNcbi8qKioqKiovIFx0Ly8gbW9kZSAmIDQ6IHJldHVybiB2YWx1ZSB3aGVuIGFscmVhZHkgbnMgb2JqZWN0XG4vKioqKioqLyBcdC8vIG1vZGUgJiAxNjogcmV0dXJuIHZhbHVlIHdoZW4gaXQncyBQcm9taXNlLWxpa2Vcbi8qKioqKiovIFx0Ly8gbW9kZSAmIDh8MTogYmVoYXZlIGxpa2UgcmVxdWlyZVxuLyoqKioqKi8gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnQgPSBmdW5jdGlvbih2YWx1ZSwgbW9kZSkge1xuLyoqKioqKi8gXHRcdGlmKG1vZGUgJiAxKSB2YWx1ZSA9IHRoaXModmFsdWUpO1xuLyoqKioqKi8gXHRcdGlmKG1vZGUgJiA4KSByZXR1cm4gdmFsdWU7XG4vKioqKioqLyBcdFx0aWYodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSkge1xuLyoqKioqKi8gXHRcdFx0aWYoKG1vZGUgJiA0KSAmJiB2YWx1ZS5fX2VzTW9kdWxlKSByZXR1cm4gdmFsdWU7XG4vKioqKioqLyBcdFx0XHRpZigobW9kZSAmIDE2KSAmJiB0eXBlb2YgdmFsdWUudGhlbiA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIHZhbHVlO1xuLyoqKioqKi8gXHRcdH1cbi8qKioqKiovIFx0XHR2YXIgbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuLyoqKioqKi8gXHRcdF9fd2VicGFja19yZXF1aXJlX18ucihucyk7XG4vKioqKioqLyBcdFx0dmFyIGRlZiA9IHt9O1xuLyoqKioqKi8gXHRcdGxlYWZQcm90b3R5cGVzID0gbGVhZlByb3RvdHlwZXMgfHwgW251bGwsIGdldFByb3RvKHt9KSwgZ2V0UHJvdG8oW10pLCBnZXRQcm90byhnZXRQcm90byldO1xuLyoqKioqKi8gXHRcdGZvcih2YXIgY3VycmVudCA9IG1vZGUgJiAyICYmIHZhbHVlOyB0eXBlb2YgY3VycmVudCA9PSAnb2JqZWN0JyAmJiAhfmxlYWZQcm90b3R5cGVzLmluZGV4T2YoY3VycmVudCk7IGN1cnJlbnQgPSBnZXRQcm90byhjdXJyZW50KSkge1xuLyoqKioqKi8gXHRcdFx0T2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoY3VycmVudCkuZm9yRWFjaCgoa2V5KSA9PiAoZGVmW2tleV0gPSAoKSA9PiAodmFsdWVba2V5XSkpKTtcbi8qKioqKiovIFx0XHR9XG4vKioqKioqLyBcdFx0ZGVmWydkZWZhdWx0J10gPSAoKSA9PiAodmFsdWUpO1xuLyoqKioqKi8gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZChucywgZGVmKTtcbi8qKioqKiovIFx0XHRyZXR1cm4gbnM7XG4vKioqKioqLyBcdH07XG4vKioqKioqLyB9KSgpO1xuLyoqKioqKi8gXG4vKioqKioqLyAvKiB3ZWJwYWNrL3J1bnRpbWUvZ2V0IGphdmFzY3JpcHQgY2h1bmsgZmlsZW5hbWUgKi9cbi8qKioqKiovICgoKSA9PiB7XG4vKioqKioqLyBcdC8vIFRoaXMgZnVuY3Rpb24gYWxsb3cgdG8gcmVmZXJlbmNlIGFzeW5jIGNodW5rc1xuLyoqKioqKi8gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnUgPSAoY2h1bmtJZCkgPT4ge1xuLyoqKioqKi8gXHRcdC8vIHJldHVybiB1cmwgZm9yIGZpbGVuYW1lcyBiYXNlZCBvbiB0ZW1wbGF0ZVxuLyoqKioqKi8gXHRcdHJldHVybiBcInN0YXRpYy9jaHVua3MvXCIgKyBjaHVua0lkICsgXCIuanNcIjtcbi8qKioqKiovIFx0fTtcbi8qKioqKiovIH0pKCk7XG4vKioqKioqLyBcbi8qKioqKiovIC8qIHdlYnBhY2svcnVudGltZS9nZXQgbWluaS1jc3MgY2h1bmsgZmlsZW5hbWUgKi9cbi8qKioqKiovICgoKSA9PiB7XG4vKioqKioqLyBcdC8vIFRoaXMgZnVuY3Rpb24gYWxsb3cgdG8gcmVmZXJlbmNlIGFzeW5jIGNodW5rc1xuLyoqKioqKi8gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm1pbmlDc3NGID0gKGNodW5rSWQpID0+IHtcbi8qKioqKiovIFx0XHQvLyByZXR1cm4gdXJsIGZvciBmaWxlbmFtZXMgYmFzZWQgb24gdGVtcGxhdGVcbi8qKioqKiovIFx0XHRyZXR1cm4gXCJzdGF0aWMvY3NzL1wiICsgY2h1bmtJZCArIFwiLmNzc1wiO1xuLyoqKioqKi8gXHR9O1xuLyoqKioqKi8gfSkoKTtcbi8qKioqKiovIFxuLyoqKioqKi8gLyogd2VicGFjay9ydW50aW1lL2dldEZ1bGxIYXNoICovXG4vKioqKioqLyAoKCkgPT4ge1xuLyoqKioqKi8gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmggPSAoKSA9PiAoXCJkMTUzMDdhOWQ2YWYzMDM4XCIpXG4vKioqKioqLyB9KSgpO1xuLyoqKioqKi8gXG4vKioqKioqLyAvKiB3ZWJwYWNrL3J1bnRpbWUvY3NzIGxvYWRpbmcgKi9cbi8qKioqKiovICgoKSA9PiB7XG4vKioqKioqLyBcdHZhciBjcmVhdGVTdHlsZXNoZWV0ID0gKGNodW5rSWQsIGZ1bGxocmVmLCByZXNvbHZlLCByZWplY3QpID0+IHtcbi8qKioqKiovIFx0XHR2YXIgbGlua1RhZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaW5rXCIpO1xuLyoqKioqKi8gXHRcbi8qKioqKiovIFx0XHRsaW5rVGFnLnJlbCA9IFwic3R5bGVzaGVldFwiO1xuLyoqKioqKi8gXHRcdGxpbmtUYWcudHlwZSA9IFwidGV4dC9jc3NcIjtcbi8qKioqKiovIFx0XHR2YXIgb25MaW5rQ29tcGxldGUgPSAoZXZlbnQpID0+IHtcbi8qKioqKiovIFx0XHRcdC8vIGF2b2lkIG1lbSBsZWFrcy5cbi8qKioqKiovIFx0XHRcdGxpbmtUYWcub25lcnJvciA9IGxpbmtUYWcub25sb2FkID0gbnVsbDtcbi8qKioqKiovIFx0XHRcdGlmIChldmVudC50eXBlID09PSAnbG9hZCcpIHtcbi8qKioqKiovIFx0XHRcdFx0cmVzb2x2ZSgpO1xuLyoqKioqKi8gXHRcdFx0fSBlbHNlIHtcbi8qKioqKiovIFx0XHRcdFx0dmFyIGVycm9yVHlwZSA9IGV2ZW50ICYmIChldmVudC50eXBlID09PSAnbG9hZCcgPyAnbWlzc2luZycgOiBldmVudC50eXBlKTtcbi8qKioqKiovIFx0XHRcdFx0dmFyIHJlYWxIcmVmID0gZXZlbnQgJiYgZXZlbnQudGFyZ2V0ICYmIGV2ZW50LnRhcmdldC5ocmVmIHx8IGZ1bGxocmVmO1xuLyoqKioqKi8gXHRcdFx0XHR2YXIgZXJyID0gbmV3IEVycm9yKFwiTG9hZGluZyBDU1MgY2h1bmsgXCIgKyBjaHVua0lkICsgXCIgZmFpbGVkLlxcbihcIiArIHJlYWxIcmVmICsgXCIpXCIpO1xuLyoqKioqKi8gXHRcdFx0XHRlcnIuY29kZSA9IFwiQ1NTX0NIVU5LX0xPQURfRkFJTEVEXCI7XG4vKioqKioqLyBcdFx0XHRcdGVyci50eXBlID0gZXJyb3JUeXBlO1xuLyoqKioqKi8gXHRcdFx0XHRlcnIucmVxdWVzdCA9IHJlYWxIcmVmO1xuLyoqKioqKi8gXHRcdFx0XHRsaW5rVGFnLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobGlua1RhZylcbi8qKioqKiovIFx0XHRcdFx0cmVqZWN0KGVycik7XG4vKioqKioqLyBcdFx0XHR9XG4vKioqKioqLyBcdFx0fVxuLyoqKioqKi8gXHRcdGxpbmtUYWcub25lcnJvciA9IGxpbmtUYWcub25sb2FkID0gb25MaW5rQ29tcGxldGU7XG4vKioqKioqLyBcdFx0bGlua1RhZy5ocmVmID0gZnVsbGhyZWY7XG4vKioqKioqLyBcdFxuLyoqKioqKi8gXHRcdChmdW5jdGlvbihsaW5rVGFnKSB7XG4vKioqKioqLyBcdFx0ICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgX05fRV9TVFlMRV9MT0FEID09PSAnZnVuY3Rpb24nKSB7XG4vKioqKioqLyBcdFx0ICAgICAgICAgICAgICAgICAgICAvLyBBdm9pZCBkZXN0cnVjdHVyaW5nIGFuZCBvcHRpb25hbC1jaGFpbmluZyBoZXJlOiB0aGlzIGZ1bmN0aW9uXG4vKioqKioqLyBcdFx0ICAgICAgICAgICAgICAgICAgICAvLyBpcyBzZXJpYWxpemVkIGFzIGEgc3RyaW5nIGJ5IG1pbmktY3NzLWV4dHJhY3QtcGx1Z2luIGFuZFxuLyoqKioqKi8gXHRcdCAgICAgICAgICAgICAgICAgICAgLy8gaW5qZWN0ZWQgZGlyZWN0bHkgaW50byB0aGUgYnJvd3NlciBidW5kbGUgd2l0aG91dCBmdXJ0aGVyXG4vKioqKioqLyBcdFx0ICAgICAgICAgICAgICAgICAgICAvLyB0cmFuc3BpbGF0aW9uLiBEZXN0cnVjdHVyaW5nIChgY29uc3QgeyB4IH0gPSBvYmpgKSBicmVha3Mgb25cbi8qKioqKiovIFx0XHQgICAgICAgICAgICAgICAgICAgIC8vIGJyb3dzZXJzIHRoYXQgcHJlLWRhdGUgRVMyMDE1IHN1cHBvcnQgKGUuZy4gQ2hyb21lIDw0OSkuXG4vKioqKioqLyBcdFx0ICAgICAgICAgICAgICAgICAgICB2YXIgaHJlZiA9IGxpbmtUYWcuaHJlZjtcbi8qKioqKiovIFx0XHQgICAgICAgICAgICAgICAgICAgIHZhciBvbmxvYWQgPSBsaW5rVGFnLm9ubG9hZDtcbi8qKioqKiovIFx0XHQgICAgICAgICAgICAgICAgICAgIHZhciBvbmVycm9yID0gbGlua1RhZy5vbmVycm9yO1xuLyoqKioqKi8gXHRcdCAgICAgICAgICAgICAgICAgICAgX05fRV9TVFlMRV9MT0FEKGhyZWYuaW5kZXhPZih3aW5kb3cubG9jYXRpb24ub3JpZ2luKSA9PT0gMCA/IG5ldyBVUkwoaHJlZikucGF0aG5hbWUgOiBocmVmKS50aGVuKGZ1bmN0aW9uKCkge1xuLyoqKioqKi8gXHRcdCAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbmxvYWQpIG9ubG9hZC5jYWxsKGxpbmtUYWcsIHtcbi8qKioqKiovIFx0XHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2xvYWQnXG4vKioqKioqLyBcdFx0ICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4vKioqKioqLyBcdFx0ICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbigpIHtcbi8qKioqKiovIFx0XHQgICAgICAgICAgICAgICAgICAgICAgICBpZiAob25lcnJvcikgb25lcnJvci5jYWxsKGxpbmtUYWcsIHt9KTtcbi8qKioqKiovIFx0XHQgICAgICAgICAgICAgICAgICAgIH0pO1xuLyoqKioqKi8gXHRcdCAgICAgICAgICAgICAgICB9IGVsc2Uge1xuLyoqKioqKi8gXHRcdCAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChsaW5rVGFnKTtcbi8qKioqKiovIFx0XHQgICAgICAgICAgICAgICAgfVxuLyoqKioqKi8gXHRcdCAgICAgICAgICAgIH0pKGxpbmtUYWcpXG4vKioqKioqLyBcdFx0cmV0dXJuIGxpbmtUYWc7XG4vKioqKioqLyBcdH07XG4vKioqKioqLyBcdHZhciBmaW5kU3R5bGVzaGVldCA9IChocmVmLCBmdWxsaHJlZikgPT4ge1xuLyoqKioqKi8gXHRcdHZhciBleGlzdGluZ0xpbmtUYWdzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJsaW5rXCIpO1xuLyoqKioqKi8gXHRcdGZvcih2YXIgaSA9IDA7IGkgPCBleGlzdGluZ0xpbmtUYWdzLmxlbmd0aDsgaSsrKSB7XG4vKioqKioqLyBcdFx0XHR2YXIgdGFnID0gZXhpc3RpbmdMaW5rVGFnc1tpXTtcbi8qKioqKiovIFx0XHRcdHZhciBkYXRhSHJlZiA9IHRhZy5nZXRBdHRyaWJ1dGUoXCJkYXRhLWhyZWZcIikgfHwgdGFnLmdldEF0dHJpYnV0ZShcImhyZWZcIik7XG4vKioqKioqLyBcdFx0XHRpZih0YWcucmVsID09PSBcInN0eWxlc2hlZXRcIiAmJiAoZGF0YUhyZWYgPT09IGhyZWYgfHwgZGF0YUhyZWYgPT09IGZ1bGxocmVmKSkgcmV0dXJuIHRhZztcbi8qKioqKiovIFx0XHR9XG4vKioqKioqLyBcdFx0dmFyIGV4aXN0aW5nU3R5bGVUYWdzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJzdHlsZVwiKTtcbi8qKioqKiovIFx0XHRmb3IodmFyIGkgPSAwOyBpIDwgZXhpc3RpbmdTdHlsZVRhZ3MubGVuZ3RoOyBpKyspIHtcbi8qKioqKiovIFx0XHRcdHZhciB0YWcgPSBleGlzdGluZ1N0eWxlVGFnc1tpXTtcbi8qKioqKiovIFx0XHRcdHZhciBkYXRhSHJlZiA9IHRhZy5nZXRBdHRyaWJ1dGUoXCJkYXRhLWhyZWZcIik7XG4vKioqKioqLyBcdFx0XHRpZihkYXRhSHJlZiA9PT0gaHJlZiB8fCBkYXRhSHJlZiA9PT0gZnVsbGhyZWYpIHJldHVybiB0YWc7XG4vKioqKioqLyBcdFx0fVxuLyoqKioqKi8gXHR9O1xuLyoqKioqKi8gXHR2YXIgbG9hZFN0eWxlc2hlZXQgPSAoY2h1bmtJZCkgPT4ge1xuLyoqKioqKi8gXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4vKioqKioqLyBcdFx0XHR2YXIgaHJlZiA9IF9fd2VicGFja19yZXF1aXJlX18ubWluaUNzc0YoY2h1bmtJZCk7XG4vKioqKioqLyBcdFx0XHR2YXIgZnVsbGhyZWYgPSBfX3dlYnBhY2tfcmVxdWlyZV9fLnAgKyBocmVmO1xuLyoqKioqKi8gXHRcdFx0aWYoZmluZFN0eWxlc2hlZXQoaHJlZiwgZnVsbGhyZWYpKSByZXR1cm4gcmVzb2x2ZSgpO1xuLyoqKioqKi8gXHRcdFx0Y3JlYXRlU3R5bGVzaGVldChjaHVua0lkLCBmdWxsaHJlZiwgcmVzb2x2ZSwgcmVqZWN0KTtcbi8qKioqKiovIFx0XHR9KTtcbi8qKioqKiovIFx0fVxuLyoqKioqKi8gXHQvLyBvYmplY3QgdG8gc3RvcmUgbG9hZGVkIENTUyBjaHVua3Ncbi8qKioqKiovIFx0dmFyIGluc3RhbGxlZENzc0NodW5rcyA9IHtcbi8qKioqKiovIFx0XHRcIndlYnBhY2tcIjogMFxuLyoqKioqKi8gXHR9O1xuLyoqKioqKi8gXHRcbi8qKioqKiovIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5mLm1pbmlDc3MgPSAoY2h1bmtJZCwgcHJvbWlzZXMpID0+IHtcbi8qKioqKiovIFx0XHR2YXIgY3NzQ2h1bmtzID0ge1wiX2FwcC1wYWdlcy1icm93c2VyX2FwcF9teXNwYWNlX2NsaWVudF90c3hcIjoxLFwiX2FwcC1wYWdlcy1icm93c2VyX2FwcF9jb3dvcmtfdHN4XCI6MSxcIl9hcHAtcGFnZXMtYnJvd3Nlcl9hcHBfcHJvZmlsZS1zY3JlZW5fdHN4XCI6MSxcIl9hcHAtcGFnZXMtYnJvd3Nlcl9hcHBfY2hhdC1yaWNoLXRleHRfdHN4XCI6MSxcIl9hcHAtcGFnZXMtYnJvd3Nlcl9hcHBfY2hhdC1hZ2VudC1wbGFuLXZpZXdfdHN4XCI6MSxcIl9hcHAtcGFnZXMtYnJvd3Nlcl9hcHBfdWktbGlicmFyeS1zY3JlZW5fdHN4XCI6MSxcIl9hcHAtcGFnZXMtYnJvd3Nlcl9hcHBfZXZvLXVpLWtpdF9ib3R0b20tc2hlZXQtZGVtb190c3hcIjoxLFwiX2FwcC1wYWdlcy1icm93c2VyX2FwcF9ldm9saW5nby1jYXJkcy1kZW1vX3RzeFwiOjEsXCJfYXBwLXBhZ2VzLWJyb3dzZXJfYXBwX2V2b2xpbmdvLWJ1dHRvbnMtdjJfdHN4XCI6MSxcIl9hcHAtcGFnZXMtYnJvd3Nlcl9hcHBfZXZvbGluZ28tZGVzaWduLXN5c3RlbS1kZW1vX3RzeFwiOjEsXCJfYXBwLXBhZ2VzLWJyb3dzZXJfYXBwX2V2b2xpbmdvLWljb25zLWRlbW9fdHN4XCI6MSxcIl9hcHAtcGFnZXMtYnJvd3Nlcl9hcHBfZXZvbGluZ28tYWktY29tcG9uZW50cy1kZW1vX3RzeFwiOjEsXCJfYXBwLXBhZ2VzLWJyb3dzZXJfYXBwX2V2b2xpbmdvLW1lbnVzLWRlbW9fdHN4XCI6MX07XG4vKioqKioqLyBcdFx0aWYoaW5zdGFsbGVkQ3NzQ2h1bmtzW2NodW5rSWRdKSBwcm9taXNlcy5wdXNoKGluc3RhbGxlZENzc0NodW5rc1tjaHVua0lkXSk7XG4vKioqKioqLyBcdFx0ZWxzZSBpZihpbnN0YWxsZWRDc3NDaHVua3NbY2h1bmtJZF0gIT09IDAgJiYgY3NzQ2h1bmtzW2NodW5rSWRdKSB7XG4vKioqKioqLyBcdFx0XHRwcm9taXNlcy5wdXNoKGluc3RhbGxlZENzc0NodW5rc1tjaHVua0lkXSA9IGxvYWRTdHlsZXNoZWV0KGNodW5rSWQpLnRoZW4oKCkgPT4ge1xuLyoqKioqKi8gXHRcdFx0XHRpbnN0YWxsZWRDc3NDaHVua3NbY2h1bmtJZF0gPSAwO1xuLyoqKioqKi8gXHRcdFx0fSwgKGUpID0+IHtcbi8qKioqKiovIFx0XHRcdFx0ZGVsZXRlIGluc3RhbGxlZENzc0NodW5rc1tjaHVua0lkXTtcbi8qKioqKiovIFx0XHRcdFx0dGhyb3cgZTtcbi8qKioqKiovIFx0XHRcdH0pKTtcbi8qKioqKiovIFx0XHR9XG4vKioqKioqLyBcdH07XG4vKioqKioqLyBcdFxuLyoqKioqKi8gXHR2YXIgb2xkVGFncyA9IFtdO1xuLyoqKioqKi8gXHR2YXIgbmV3VGFncyA9IFtdO1xuLyoqKioqKi8gXHR2YXIgYXBwbHlIYW5kbGVyID0gKG9wdGlvbnMpID0+IHtcbi8qKioqKiovIFx0XHRyZXR1cm4geyBkaXNwb3NlOiAoKSA9PiB7XG4vKioqKioqLyBcdFx0XHRmb3IodmFyIGkgPSAwOyBpIDwgb2xkVGFncy5sZW5ndGg7IGkrKykge1xuLyoqKioqKi8gXHRcdFx0XHR2YXIgb2xkVGFnID0gb2xkVGFnc1tpXTtcbi8qKioqKiovIFx0XHRcdFx0aWYob2xkVGFnLnBhcmVudE5vZGUpIG9sZFRhZy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG9sZFRhZyk7XG4vKioqKioqLyBcdFx0XHR9XG4vKioqKioqLyBcdFx0XHRvbGRUYWdzLmxlbmd0aCA9IDA7XG4vKioqKioqLyBcdFx0fSwgYXBwbHk6ICgpID0+IHtcbi8qKioqKiovIFx0XHRcdGZvcih2YXIgaSA9IDA7IGkgPCBuZXdUYWdzLmxlbmd0aDsgaSsrKSBuZXdUYWdzW2ldLnJlbCA9IFwic3R5bGVzaGVldFwiO1xuLyoqKioqKi8gXHRcdFx0bmV3VGFncy5sZW5ndGggPSAwO1xuLyoqKioqKi8gXHRcdH0gfTtcbi8qKioqKiovIFx0fVxuLyoqKioqKi8gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmhtckMubWluaUNzcyA9IChjaHVua0lkcywgcmVtb3ZlZENodW5rcywgcmVtb3ZlZE1vZHVsZXMsIHByb21pc2VzLCBhcHBseUhhbmRsZXJzLCB1cGRhdGVkTW9kdWxlc0xpc3QpID0+IHtcbi8qKioqKiovIFx0XHRhcHBseUhhbmRsZXJzLnB1c2goYXBwbHlIYW5kbGVyKTtcbi8qKioqKiovIFx0XHRjaHVua0lkcy5mb3JFYWNoKChjaHVua0lkKSA9PiB7XG4vKioqKioqLyBcdFx0XHR2YXIgaHJlZiA9IF9fd2VicGFja19yZXF1aXJlX18ubWluaUNzc0YoY2h1bmtJZCk7XG4vKioqKioqLyBcdFx0XHR2YXIgZnVsbGhyZWYgPSBfX3dlYnBhY2tfcmVxdWlyZV9fLnAgKyBocmVmO1xuLyoqKioqKi8gXHRcdFx0dmFyIG9sZFRhZyA9IGZpbmRTdHlsZXNoZWV0KGhyZWYsIGZ1bGxocmVmKTtcbi8qKioqKiovIFx0XHRcdGlmKCFvbGRUYWcpIHJldHVybjtcbi8qKioqKiovIFx0XHRcdHByb21pc2VzLnB1c2gobmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuLyoqKioqKi8gXHRcdFx0XHR2YXIgdGFnID0gY3JlYXRlU3R5bGVzaGVldChjaHVua0lkLCBmdWxsaHJlZiwgKCkgPT4ge1xuLyoqKioqKi8gXHRcdFx0XHRcdHRhZy5hcyA9IFwic3R5bGVcIjtcbi8qKioqKiovIFx0XHRcdFx0XHR0YWcucmVsID0gXCJwcmVsb2FkXCI7XG4vKioqKioqLyBcdFx0XHRcdFx0cmVzb2x2ZSgpO1xuLyoqKioqKi8gXHRcdFx0XHR9LCByZWplY3QpO1xuLyoqKioqKi8gXHRcdFx0XHRvbGRUYWdzLnB1c2gob2xkVGFnKTtcbi8qKioqKiovIFx0XHRcdFx0bmV3VGFncy5wdXNoKHRhZyk7XG4vKioqKioqLyBcdFx0XHR9KSk7XG4vKioqKioqLyBcdFx0fSk7XG4vKioqKioqLyBcdH1cbi8qKioqKiovIH0pKCk7XG4vKioqKioqLyBcbi8qKioqKiovIH1cbikiXX0=
;