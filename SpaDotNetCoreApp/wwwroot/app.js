(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router_1 = require("./router");
const updateElement = (element, selector, value) => {
    let result = element.querySelector(selector);
    if (result) {
        result.innerHTML = value;
    }
};
new router_1.default()
    .onNavigate(e => updateElement(e.element, ".params", JSON.stringify(e.params)))
    .onError(e => e.router.reveal("/error").then(args => updateElement(args.element, "code", document.location.hash)))
    .start();
console.log("hello world");
},{"./router":2}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Router {
    constructor(args = {}) {
        this.hashChar = "#";
        this.onErrorHandler = event => { throw new Error(`Unknown route: ${event.hashChangedEvent.newURL}`); };
        this.onBeforeNavigateHandler = route => { };
        this.onBeforeLeaveHandler = route => { };
        this.onNavigateHandler = route => { };
        this.onLeaveHandler = route => { };
        args = Object.assign({
            element: document.body,
            hashChar: "#",
            test: ((r) => /^[A-Za-z0-9_@()/.-]*$/.test(r))
        }, args);
        this.hashChar = args.hashChar;
        this.routes = {};
        for (let e of args.element.querySelectorAll("[data-route]")) {
            let element = e, route = element.dataset["route"];
            if (!args.test(route)) {
                throw new Error(`Invalid route definition: ${route}`);
            }
            if (!route.startsWith("/")) {
                throw new Error(`Invalid route definition: ${route}`);
            }
            let defaultParams = {}, paramMap = null;
            const p = element.dataset["routeParams"], params = {};
            if (!p) {
                paramMap = new Map();
            }
            else {
                try {
                    defaultParams = JSON.parse(p);
                    paramMap = new Map(Object.entries(defaultParams));
                }
                catch (e) {
                    console.error(`Couldn't deserialize default params for route ${route}: ${e}.\nMake sure that "${p}" is valid JSON...`);
                }
            }
            let templateUrl = element.dataset["routeTemplateUrl"];
            if (!templateUrl) {
                templateUrl = null;
            }
            this.routes[route] = { route, element, defaultParams, paramMap, params, templateUrl };
        }
    }
    start() {
        window.addEventListener("hashchange", event => this.onHashChange(event));
        window.dispatchEvent(new HashChangeEvent("hashchange"));
        return this;
    }
    onError(event) {
        this.onErrorHandler = event;
        return this;
    }
    onNavigate(event) {
        this.onNavigateHandler = event;
        return this;
    }
    onLeave(event) {
        this.onLeaveHandler = event;
        return this;
    }
    onBeforeNavigate(event) {
        this.onBeforeNavigateHandler = event;
        return this;
    }
    onBeforeLeave(event) {
        this.onBeforeLeaveHandler = event;
        return this;
    }
    navigate(route) {
        document.location.hash = this.hashChar + route;
        return this;
    }
    reveal(route) {
        return this.revealUri(route, null);
    }
    onHashChange(event) {
        let hash = document.location.hash;
        if (hash && event.newURL) {
            hash = event.newURL.replace(document.location.origin + document.location.pathname, "");
        }
        hash = hash.replace(document.location.search, "");
        this.revealUri(hash.replace(this.hashChar, ""), event);
    }
    async revealUri(uri, event) {
        const uriPieces = uri.split("/").map(item => decodeURIComponent(item));
        let route, candidate, test = "";
        let i, len, sliceIndex;
        for (i = 0, len = uriPieces.length; i < len; i++) {
            let piece = uriPieces[i];
            test = test.endsWith("/") ? test + piece : test + "/" + piece;
            candidate = this.routes[test];
            if ((candidate && !route) || (candidate && route.route.length < candidate.route.length)) {
                route = candidate;
                sliceIndex = i + 1;
            }
        }
        let eventResult;
        if (this.current) {
            const args = this.buildRouteEventArgs(this.current, event);
            eventResult = this.onBeforeLeaveHandler(args);
            if (eventResult == false) {
                return;
            }
            if (eventResult instanceof Promise) {
                eventResult = await eventResult;
                if (eventResult == false) {
                    return;
                }
            }
            this.current.element.style["display"] = "none";
            eventResult = this.onLeaveHandler(args);
            if (eventResult == false) {
                return;
            }
            if (eventResult instanceof Promise) {
                eventResult = await eventResult;
                if (eventResult == false) {
                    return;
                }
            }
        }
        if (uriPieces[uriPieces.length - 1] === "") {
            uriPieces.splice(-1, 1);
        }
        const pieces = uriPieces.slice(sliceIndex);
        if (route) {
            if (pieces.length > route.paramMap.size) {
                route = null;
            }
            else {
                route.params = Object.assign({}, route.defaultParams);
                route.paramMap = new Map(Object.entries(route.params));
                if (pieces.length) {
                    let keys = Array.from(route.paramMap.keys());
                    for (i = 0, len = pieces.length; i < len; i++) {
                        let piece = pieces[i];
                        let key = keys[i];
                        route.paramMap.set(key, piece);
                        route.params[key] = piece;
                    }
                }
            }
        }
        if (route) {
            this.current = route;
            const args = this.buildRouteEventArgs(this.current, event);
            eventResult = this.onBeforeNavigateHandler(args);
            if (eventResult == false) {
                return;
            }
            if (eventResult instanceof Promise) {
                eventResult = await eventResult;
                if (eventResult == false) {
                    return;
                }
            }
            if (route.templateUrl) {
                let result = [];
                let i = 0, idx;
                const values = Array.from(route.paramMap.values());
                for (let piece of route.templateUrl.split(/{/)) {
                    idx = piece.indexOf("}");
                    if (idx != -1) {
                        result.push(values[i++] + piece.substring(idx + 1, piece.length));
                    }
                    else {
                        result.push(piece);
                    }
                }
                const response = await fetch(result.join(""), { method: "get" });
                if (!response.ok) {
                    this.onErrorHandler(args);
                }
                route.element.innerHTML = await response.text();
            }
            this.current.element.style["display"] = "contents";
            eventResult = this.onNavigateHandler(args);
            if (eventResult instanceof Promise) {
                await eventResult;
            }
            return args;
        }
        else {
            this.current = null;
            const args = this.buildRouteEventArgs(null, event);
            this.onErrorHandler(args);
            return args;
        }
    }
    buildRouteEventArgs(route, event) {
        return {
            route: route == null ? null : route.route,
            params: route == null ? null : route.params,
            router: this,
            element: route == null ? null : route.element,
            hashChangedEvent: event
        };
    }
}
exports.default = Router;
},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbWFpbi50cyIsInNyYy9yb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0FDLHFDQUE4QjtBQUUvQixNQUFNLGFBQWEsR0FBRyxDQUFDLE9BQW9CLEVBQUUsUUFBZ0IsRUFBRSxLQUFhLEVBQUUsRUFBRTtJQUM1RSxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzdDLElBQUksTUFBTSxFQUFFO1FBQ1IsTUFBTSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7S0FDNUI7QUFDTCxDQUFDLENBQUE7QUFFRCxJQUFJLGdCQUFNLEVBQUU7S0FDUCxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztLQUM5RSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ2pILEtBQUssRUFBRSxDQUFDO0FBR2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQzs7OztBQ1czQixNQUFxQixNQUFNO0lBV3ZCLFlBQVksT0FBdUIsRUFBRTtRQVY3QixhQUFRLEdBQUcsR0FBRyxDQUFDO1FBQ2YsbUJBQWMsR0FBZSxLQUFLLENBQUMsRUFBRSxHQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBLENBQUEsQ0FBQyxDQUFDO1FBQzNHLDRCQUF1QixHQUFlLEtBQUssQ0FBQyxFQUFFLEdBQUUsQ0FBQyxDQUFDO1FBQ2xELHlCQUFvQixHQUFlLEtBQUssQ0FBQyxFQUFFLEdBQUUsQ0FBQyxDQUFDO1FBQy9DLHNCQUFpQixHQUFlLEtBQUssQ0FBQyxFQUFFLEdBQUUsQ0FBQyxDQUFDO1FBQzVDLG1CQUFjLEdBQWUsS0FBSyxDQUFDLEVBQUUsR0FBRSxDQUFDLENBQUM7UUFNN0MsSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDakIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxJQUFJO1lBQ3RCLFFBQVEsRUFBRSxHQUFHO1lBQ2IsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN6RCxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ1QsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzlCLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBQ2pCLEtBQUksSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsRUFBRTtZQUN4RCxJQUFJLE9BQU8sR0FBSSxDQUFpQixFQUFFLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBVyxDQUFDO1lBQzdFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixLQUFLLEVBQUUsQ0FBQyxDQUFDO2FBQ3pEO1lBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLEtBQUssRUFBRSxDQUFDLENBQUM7YUFDekQ7WUFDRCxJQUFJLGFBQWEsR0FBRyxFQUFFLEVBQUUsUUFBUSxHQUFHLElBQUksQ0FBQztZQUN4QyxNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBVyxFQUFFLE1BQU0sR0FBRyxFQUFFLENBQUM7WUFDaEUsSUFBSSxDQUFDLENBQUMsRUFBRTtnQkFDSixRQUFRLEdBQUcsSUFBSSxHQUFHLEVBQWUsQ0FBQzthQUNyQztpQkFBTTtnQkFDSCxJQUFJO29CQUNBLGFBQWEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUM5QixRQUFRLEdBQUcsSUFBSSxHQUFHLENBQWMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO2lCQUNsRTtnQkFBQyxPQUFPLENBQUMsRUFBRTtvQkFDUixPQUFPLENBQUMsS0FBSyxDQUFDLGlEQUFpRCxLQUFLLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO2lCQUMxSDthQUNKO1lBQ0QsSUFBSSxXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBVyxDQUFDO1lBQ2hFLElBQUksQ0FBQyxXQUFXLEVBQUU7Z0JBQ2QsV0FBVyxHQUFHLElBQUksQ0FBQzthQUN0QjtZQUNELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBQyxDQUFDO1NBQ3ZGO0lBRUwsQ0FBQztJQUVNLEtBQUs7UUFDUixNQUFNLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sQ0FBQyxhQUFhLENBQUMsSUFBSSxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUN4RCxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0lBRU0sT0FBTyxDQUFDLEtBQWlCO1FBQzVCLElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDO1FBQzVCLE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFFTSxVQUFVLENBQUMsS0FBaUI7UUFDL0IsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEtBQUssQ0FBQztRQUMvQixPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0lBRU0sT0FBTyxDQUFDLEtBQWlCO1FBQzVCLElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDO1FBQzVCLE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFFTSxnQkFBZ0IsQ0FBQyxLQUFpQjtRQUNyQyxJQUFJLENBQUMsdUJBQXVCLEdBQUcsS0FBSyxDQUFDO1FBQ3JDLE9BQU8sSUFBSSxDQUFDO0lBQ2hCLENBQUM7SUFFTSxhQUFhLENBQUMsS0FBaUI7UUFDbEMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLEtBQUssQ0FBQztRQUNsQyxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0lBRU0sUUFBUSxDQUFDLEtBQWE7UUFDekIsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDL0MsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUFhO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVPLFlBQVksQ0FBQyxLQUFzQjtRQUN2QyxJQUFJLElBQUksR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztRQUNsQyxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFO1lBQ3RCLElBQUksR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztTQUMxRjtRQUNELElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFTyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQVcsRUFBRSxLQUFzQjtRQUN2RCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDdkUsSUFBSSxLQUFhLEVBQUUsU0FBaUIsRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2hELElBQUksQ0FBUyxFQUFFLEdBQVcsRUFBRSxVQUFrQixDQUFDO1FBQy9DLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzlDLElBQUksS0FBSyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QixJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxLQUFLLENBQUM7WUFDOUQsU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOUIsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3JGLEtBQUssR0FBRyxTQUFTLENBQUM7Z0JBQ2xCLFVBQVUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ3RCO1NBQ0o7UUFDRCxJQUFJLFdBQThELENBQUM7UUFDbkUsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ2QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDM0QsV0FBVyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM5QyxJQUFJLFdBQVcsSUFBSSxLQUFLLEVBQUU7Z0JBQ3RCLE9BQU87YUFDVjtZQUNELElBQUksV0FBVyxZQUFZLE9BQU8sRUFBRTtnQkFDaEMsV0FBVyxHQUFHLE1BQU0sV0FBVyxDQUFDO2dCQUNoQyxJQUFJLFdBQVcsSUFBSSxLQUFLLEVBQUU7b0JBQ3RCLE9BQU87aUJBQ1Y7YUFDSjtZQUNELElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxNQUFNLENBQUM7WUFDL0MsV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEMsSUFBSSxXQUFXLElBQUksS0FBSyxFQUFFO2dCQUN0QixPQUFPO2FBQ1Y7WUFDRCxJQUFJLFdBQVcsWUFBWSxPQUFPLEVBQUU7Z0JBQ2hDLFdBQVcsR0FBRyxNQUFNLFdBQVcsQ0FBQztnQkFDaEMsSUFBSSxXQUFXLElBQUksS0FBSyxFQUFFO29CQUN0QixPQUFPO2lCQUNWO2FBQ0o7U0FDSjtRQUVELElBQUksU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ3hDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDM0I7UUFDRCxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzNDLElBQUksS0FBSyxFQUFFO1lBQ1AsSUFBSSxNQUFNLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFO2dCQUNyQyxLQUFLLEdBQUcsSUFBSSxDQUFDO2FBQ2hCO2lCQUFNO2dCQUNILEtBQUssQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUN0RCxLQUFLLENBQUMsUUFBUSxHQUFHLElBQUksR0FBRyxDQUFjLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ3BFLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRTtvQkFDZixJQUFJLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztvQkFDN0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7d0JBQzNDLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDdEIsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNsQixLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7d0JBQy9CLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO3FCQUM3QjtpQkFDSjthQUNKO1NBQ0o7UUFDRCxJQUFJLEtBQUssRUFBRTtZQUNQLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1lBQ3JCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNELFdBQVcsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakQsSUFBSSxXQUFXLElBQUksS0FBSyxFQUFFO2dCQUN0QixPQUFPO2FBQ1Y7WUFDRCxJQUFJLFdBQVcsWUFBWSxPQUFPLEVBQUU7Z0JBQ2hDLFdBQVcsR0FBRyxNQUFNLFdBQVcsQ0FBQztnQkFDaEMsSUFBSSxXQUFXLElBQUksS0FBSyxFQUFFO29CQUN0QixPQUFPO2lCQUNWO2FBQ0o7WUFDRCxJQUFJLEtBQUssQ0FBQyxXQUFXLEVBQUU7Z0JBQ25CLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQVcsQ0FBQztnQkFDdkIsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7Z0JBQ25ELEtBQUksSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQzNDLEdBQUcsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUN6QixJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRTt3QkFDWCxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztxQkFDckU7eUJBQU07d0JBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztxQkFDdEI7aUJBQ0o7Z0JBQ0QsTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUNqRSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRTtvQkFDZCxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUM3QjtnQkFDRCxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQzthQUNuRDtZQUNELElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxVQUFVLENBQUM7WUFDbkQsV0FBVyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMzQyxJQUFJLFdBQVcsWUFBWSxPQUFPLEVBQUU7Z0JBQ2hDLE1BQU0sV0FBVyxDQUFDO2FBQ3JCO1lBQ0QsT0FBTyxJQUFJLENBQUM7U0FDZjthQUFNO1lBQ0gsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7WUFDcEIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNuRCxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFCLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7SUFDTCxDQUFDO0lBRU8sbUJBQW1CLENBQUMsS0FBYSxFQUFFLEtBQXNCO1FBQzdELE9BQU87WUFDSCxLQUFLLEVBQUUsS0FBSyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSztZQUN6QyxNQUFNLEVBQUUsS0FBSyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTTtZQUMzQyxNQUFNLEVBQUUsSUFBSTtZQUNaLE9BQU8sRUFBRSxLQUFLLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPO1lBQzdDLGdCQUFnQixFQUFFLEtBQUs7U0FDMUIsQ0FBQTtJQUNMLENBQUM7Q0FDSjtBQW5ORCx5QkFtTkMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCLvu79pbXBvcnQgUm91dGVyIGZyb20gXCIuL3JvdXRlclwiO1xyXG5cclxuY29uc3QgdXBkYXRlRWxlbWVudCA9IChlbGVtZW50OiBIVE1MRWxlbWVudCwgc2VsZWN0b3I6IHN0cmluZywgdmFsdWU6IHN0cmluZykgPT4ge1xyXG4gICAgbGV0IHJlc3VsdCA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XHJcbiAgICBpZiAocmVzdWx0KSB7XHJcbiAgICAgICAgcmVzdWx0LmlubmVySFRNTCA9IHZhbHVlO1xyXG4gICAgfVxyXG59XHJcblxyXG5uZXcgUm91dGVyKClcclxuICAgIC5vbk5hdmlnYXRlKGUgPT4gdXBkYXRlRWxlbWVudChlLmVsZW1lbnQsIFwiLnBhcmFtc1wiLCBKU09OLnN0cmluZ2lmeShlLnBhcmFtcykpKVxyXG4gICAgLm9uRXJyb3IoZSA9PiBlLnJvdXRlci5yZXZlYWwoXCIvZXJyb3JcIikudGhlbihhcmdzID0+IHVwZGF0ZUVsZW1lbnQoYXJncy5lbGVtZW50LCBcImNvZGVcIiwgZG9jdW1lbnQubG9jYXRpb24uaGFzaCkpKVxyXG4gICAgLnN0YXJ0KCk7XHJcblxyXG5cclxuY29uc29sZS5sb2coXCJoZWxsbyB3b3JsZFwiKTsiLCLvu79pbnRlcmZhY2UgSVJvdXRlIHtcclxuICAgIHJvdXRlOiBzdHJpbmc7XHJcbiAgICBlbGVtZW50OiBIVE1MRWxlbWVudDtcclxuICAgIGRlZmF1bHRQYXJhbXM6IFJlY29yZDxzdHJpbmcsIGFueT47XHJcbiAgICBwYXJhbU1hcDogTWFwPHN0cmluZywgYW55PjtcclxuICAgIHBhcmFtczogUmVjb3JkPHN0cmluZywgYW55PjtcclxuICAgIHRlbXBsYXRlVXJsOiBzdHJpbmc7XHJcbn1cclxuXHJcbnR5cGUgUm91dGVFdmVudEFyZ3MgPSB7XHJcbiAgICByb3V0ZTogc3RyaW5nO1xyXG4gICAgcGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG4gICAgcm91dGVyOiBSb3V0ZXI7XHJcbiAgICBlbGVtZW50OiBIVE1MRWxlbWVudDtcclxuICAgIGhhc2hDaGFuZ2VkRXZlbnQ6IEhhc2hDaGFuZ2VFdmVudDtcclxufTtcclxuXHJcbnR5cGUgUm91dGVyQ3RvckFyZ3MgPSB7XHJcbiAgICBlbGVtZW50PzogRWxlbWVudDtcclxuICAgIGhhc2hDaGFyPzogc3RyaW5nO1xyXG4gICAgdGVzdD86IChyb3V0ZTogc3RyaW5nKSA9PiBib29sZWFuO1xyXG59XHJcblxyXG50eXBlIEVycm9yRXZlbnQgPSAoZXZlbnQ6IFJvdXRlRXZlbnRBcmdzKSA9PiB2b2lkO1xyXG50eXBlIFJvdXRlRXZlbnQgPSAoZXZlbnQ6IFJvdXRlRXZlbnRBcmdzKSA9PiB2b2lkIHwgYm9vbGVhbiB8IFByb21pc2U8dm9pZD4gfCBQcm9taXNlPGJvb2xlYW4+O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUm91dGVyIHtcclxuICAgIHByaXZhdGUgaGFzaENoYXIgPSBcIiNcIjtcclxuICAgIHByaXZhdGUgb25FcnJvckhhbmRsZXI6IEVycm9yRXZlbnQgPSBldmVudCA9PiB7dGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHJvdXRlOiAke2V2ZW50Lmhhc2hDaGFuZ2VkRXZlbnQubmV3VVJMfWApfTtcclxuICAgIHByaXZhdGUgb25CZWZvcmVOYXZpZ2F0ZUhhbmRsZXI6IFJvdXRlRXZlbnQgPSByb3V0ZSA9PiB7fTtcclxuICAgIHByaXZhdGUgb25CZWZvcmVMZWF2ZUhhbmRsZXI6IFJvdXRlRXZlbnQgPSByb3V0ZSA9PiB7fTtcclxuICAgIHByaXZhdGUgb25OYXZpZ2F0ZUhhbmRsZXI6IFJvdXRlRXZlbnQgPSByb3V0ZSA9PiB7fTtcclxuICAgIHByaXZhdGUgb25MZWF2ZUhhbmRsZXI6IFJvdXRlRXZlbnQgPSByb3V0ZSA9PiB7fTtcclxuXHJcbiAgICBwdWJsaWMgY3VycmVudDogSVJvdXRlO1xyXG4gICAgcHVibGljIHJvdXRlczogUmVjb3JkPHN0cmluZywgSVJvdXRlPjtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihhcmdzOiBSb3V0ZXJDdG9yQXJncyA9IHt9KSB7XHJcbiAgICAgICAgYXJncyA9IE9iamVjdC5hc3NpZ24oe1xyXG4gICAgICAgICAgICBlbGVtZW50OiBkb2N1bWVudC5ib2R5LFxyXG4gICAgICAgICAgICBoYXNoQ2hhcjogXCIjXCIsXHJcbiAgICAgICAgICAgIHRlc3Q6ICgocjogc3RyaW5nKSA9PiAvXltBLVphLXowLTlfQCgpLy4tXSokLy50ZXN0KHIpKVxyXG4gICAgICAgIH0sIGFyZ3MpO1xyXG4gICAgICAgIHRoaXMuaGFzaENoYXIgPSBhcmdzLmhhc2hDaGFyO1xyXG4gICAgICAgIHRoaXMucm91dGVzID0ge307XHJcbiAgICAgICAgZm9yKGxldCBlIG9mIGFyZ3MuZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiW2RhdGEtcm91dGVdXCIpKSB7XHJcbiAgICAgICAgICAgIGxldCBlbGVtZW50ID0gKGUgYXMgSFRNTEVsZW1lbnQpLCByb3V0ZSA9IGVsZW1lbnQuZGF0YXNldFtcInJvdXRlXCJdIGFzIHN0cmluZztcclxuICAgICAgICAgICAgaWYgKCFhcmdzLnRlc3Qocm91dGUpKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcm91dGUgZGVmaW5pdGlvbjogJHtyb3V0ZX1gKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIXJvdXRlLnN0YXJ0c1dpdGgoXCIvXCIpKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcm91dGUgZGVmaW5pdGlvbjogJHtyb3V0ZX1gKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgZGVmYXVsdFBhcmFtcyA9IHt9LCBwYXJhbU1hcCA9IG51bGw7XHJcbiAgICAgICAgICAgIGNvbnN0IHAgPSBlbGVtZW50LmRhdGFzZXRbXCJyb3V0ZVBhcmFtc1wiXSBhcyBzdHJpbmcsIHBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgICBpZiAoIXApIHtcclxuICAgICAgICAgICAgICAgIHBhcmFtTWFwID0gbmV3IE1hcDxzdHJpbmcsIGFueT4oKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdFBhcmFtcyA9IEpTT04ucGFyc2UocCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1NYXAgPSBuZXcgTWFwPHN0cmluZywgYW55PihPYmplY3QuZW50cmllcyhkZWZhdWx0UGFyYW1zKSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgQ291bGRuJ3QgZGVzZXJpYWxpemUgZGVmYXVsdCBwYXJhbXMgZm9yIHJvdXRlICR7cm91dGV9OiAke2V9Llxcbk1ha2Ugc3VyZSB0aGF0IFwiJHtwfVwiIGlzIHZhbGlkIEpTT04uLi5gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgdGVtcGxhdGVVcmwgPSBlbGVtZW50LmRhdGFzZXRbXCJyb3V0ZVRlbXBsYXRlVXJsXCJdIGFzIHN0cmluZztcclxuICAgICAgICAgICAgaWYgKCF0ZW1wbGF0ZVVybCkge1xyXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmwgPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMucm91dGVzW3JvdXRlXSA9IHtyb3V0ZSwgZWxlbWVudCwgZGVmYXVsdFBhcmFtcywgcGFyYW1NYXAsIHBhcmFtcywgdGVtcGxhdGVVcmx9O1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc3RhcnQoKSB7XHJcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJoYXNoY2hhbmdlXCIsIGV2ZW50ID0+IHRoaXMub25IYXNoQ2hhbmdlKGV2ZW50KSk7XHJcbiAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IEhhc2hDaGFuZ2VFdmVudChcImhhc2hjaGFuZ2VcIikpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBvbkVycm9yKGV2ZW50OiBFcnJvckV2ZW50KSB7XHJcbiAgICAgICAgdGhpcy5vbkVycm9ySGFuZGxlciA9IGV2ZW50O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBvbk5hdmlnYXRlKGV2ZW50OiBSb3V0ZUV2ZW50KSB7XHJcbiAgICAgICAgdGhpcy5vbk5hdmlnYXRlSGFuZGxlciA9IGV2ZW50O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBvbkxlYXZlKGV2ZW50OiBSb3V0ZUV2ZW50KSB7XHJcbiAgICAgICAgdGhpcy5vbkxlYXZlSGFuZGxlciA9IGV2ZW50O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBvbkJlZm9yZU5hdmlnYXRlKGV2ZW50OiBSb3V0ZUV2ZW50KSB7XHJcbiAgICAgICAgdGhpcy5vbkJlZm9yZU5hdmlnYXRlSGFuZGxlciA9IGV2ZW50O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBvbkJlZm9yZUxlYXZlKGV2ZW50OiBSb3V0ZUV2ZW50KSB7XHJcbiAgICAgICAgdGhpcy5vbkJlZm9yZUxlYXZlSGFuZGxlciA9IGV2ZW50O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBuYXZpZ2F0ZShyb3V0ZTogc3RyaW5nKSB7XHJcbiAgICAgICAgZG9jdW1lbnQubG9jYXRpb24uaGFzaCA9IHRoaXMuaGFzaENoYXIgKyByb3V0ZTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgcmV2ZWFsKHJvdXRlOiBzdHJpbmcpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5yZXZlYWxVcmkocm91dGUsIG51bGwpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgb25IYXNoQ2hhbmdlKGV2ZW50OiBIYXNoQ2hhbmdlRXZlbnQpIHtcclxuICAgICAgICBsZXQgaGFzaCA9IGRvY3VtZW50LmxvY2F0aW9uLmhhc2g7XHJcbiAgICAgICAgaWYgKGhhc2ggJiYgZXZlbnQubmV3VVJMKSB7XHJcbiAgICAgICAgICAgIGhhc2ggPSBldmVudC5uZXdVUkwucmVwbGFjZShkb2N1bWVudC5sb2NhdGlvbi5vcmlnaW4gKyBkb2N1bWVudC5sb2NhdGlvbi5wYXRobmFtZSwgXCJcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGhhc2ggPSBoYXNoLnJlcGxhY2UoZG9jdW1lbnQubG9jYXRpb24uc2VhcmNoLCBcIlwiKTtcclxuICAgICAgICB0aGlzLnJldmVhbFVyaShoYXNoLnJlcGxhY2UodGhpcy5oYXNoQ2hhciwgXCJcIiksIGV2ZW50KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHJldmVhbFVyaSh1cmk6IHN0cmluZywgZXZlbnQ6IEhhc2hDaGFuZ2VFdmVudCkge1xyXG4gICAgICAgIGNvbnN0IHVyaVBpZWNlcyA9IHVyaS5zcGxpdChcIi9cIikubWFwKGl0ZW0gPT4gZGVjb2RlVVJJQ29tcG9uZW50KGl0ZW0pKTtcclxuICAgICAgICBsZXQgcm91dGU6IElSb3V0ZSwgY2FuZGlkYXRlOiBJUm91dGUsIHRlc3QgPSBcIlwiO1xyXG4gICAgICAgIGxldCBpOiBudW1iZXIsIGxlbjogbnVtYmVyLCBzbGljZUluZGV4OiBudW1iZXI7XHJcbiAgICAgICAgZm9yIChpID0gMCwgbGVuID0gdXJpUGllY2VzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgICAgIGxldCBwaWVjZSA9IHVyaVBpZWNlc1tpXTtcclxuICAgICAgICAgICAgdGVzdCA9IHRlc3QuZW5kc1dpdGgoXCIvXCIpID8gdGVzdCArIHBpZWNlIDogdGVzdCArIFwiL1wiICsgcGllY2U7XHJcbiAgICAgICAgICAgIGNhbmRpZGF0ZSA9IHRoaXMucm91dGVzW3Rlc3RdO1xyXG4gICAgICAgICAgICBpZiAoKGNhbmRpZGF0ZSAmJiAhcm91dGUpIHx8IChjYW5kaWRhdGUgJiYgcm91dGUucm91dGUubGVuZ3RoIDwgY2FuZGlkYXRlLnJvdXRlLmxlbmd0aCkpIHtcclxuICAgICAgICAgICAgICAgIHJvdXRlID0gY2FuZGlkYXRlO1xyXG4gICAgICAgICAgICAgICAgc2xpY2VJbmRleCA9IGkgKyAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBldmVudFJlc3VsdDogdm9pZCB8IGJvb2xlYW4gfCBQcm9taXNlPHZvaWQ+IHwgUHJvbWlzZTxib29sZWFuPjtcclxuICAgICAgICBpZiAodGhpcy5jdXJyZW50KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFyZ3MgPSB0aGlzLmJ1aWxkUm91dGVFdmVudEFyZ3ModGhpcy5jdXJyZW50LCBldmVudCk7XHJcbiAgICAgICAgICAgIGV2ZW50UmVzdWx0ID0gdGhpcy5vbkJlZm9yZUxlYXZlSGFuZGxlcihhcmdzKTtcclxuICAgICAgICAgICAgaWYgKGV2ZW50UmVzdWx0ID09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGV2ZW50UmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSkge1xyXG4gICAgICAgICAgICAgICAgZXZlbnRSZXN1bHQgPSBhd2FpdCBldmVudFJlc3VsdDtcclxuICAgICAgICAgICAgICAgIGlmIChldmVudFJlc3VsdCA9PSBmYWxzZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnQuZWxlbWVudC5zdHlsZVtcImRpc3BsYXlcIl0gPSBcIm5vbmVcIjtcclxuICAgICAgICAgICAgZXZlbnRSZXN1bHQgPSB0aGlzLm9uTGVhdmVIYW5kbGVyKGFyZ3MpO1xyXG4gICAgICAgICAgICBpZiAoZXZlbnRSZXN1bHQgPT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoZXZlbnRSZXN1bHQgaW5zdGFuY2VvZiBQcm9taXNlKSB7XHJcbiAgICAgICAgICAgICAgICBldmVudFJlc3VsdCA9IGF3YWl0IGV2ZW50UmVzdWx0O1xyXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50UmVzdWx0ID09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodXJpUGllY2VzW3VyaVBpZWNlcy5sZW5ndGggLSAxXSA9PT0gXCJcIikge1xyXG4gICAgICAgICAgICB1cmlQaWVjZXMuc3BsaWNlKC0xLCAxKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgcGllY2VzID0gdXJpUGllY2VzLnNsaWNlKHNsaWNlSW5kZXgpO1xyXG4gICAgICAgIGlmIChyb3V0ZSkge1xyXG4gICAgICAgICAgICBpZiAocGllY2VzLmxlbmd0aCA+IHJvdXRlLnBhcmFtTWFwLnNpemUpIHtcclxuICAgICAgICAgICAgICAgIHJvdXRlID0gbnVsbDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJvdXRlLnBhcmFtcyA9IE9iamVjdC5hc3NpZ24oe30sIHJvdXRlLmRlZmF1bHRQYXJhbXMpO1xyXG4gICAgICAgICAgICAgICAgcm91dGUucGFyYW1NYXAgPSBuZXcgTWFwPHN0cmluZywgYW55PihPYmplY3QuZW50cmllcyhyb3V0ZS5wYXJhbXMpKTtcclxuICAgICAgICAgICAgICAgIGlmIChwaWVjZXMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGtleXMgPSBBcnJheS5mcm9tKHJvdXRlLnBhcmFtTWFwLmtleXMoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMCwgbGVuID0gcGllY2VzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwaWVjZSA9IHBpZWNlc1tpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGtleSA9IGtleXNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdXRlLnBhcmFtTWFwLnNldChrZXksIHBpZWNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcm91dGUucGFyYW1zW2tleV0gPSBwaWVjZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHJvdXRlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudCA9IHJvdXRlO1xyXG4gICAgICAgICAgICBjb25zdCBhcmdzID0gdGhpcy5idWlsZFJvdXRlRXZlbnRBcmdzKHRoaXMuY3VycmVudCwgZXZlbnQpO1xyXG4gICAgICAgICAgICBldmVudFJlc3VsdCA9IHRoaXMub25CZWZvcmVOYXZpZ2F0ZUhhbmRsZXIoYXJncyk7XHJcbiAgICAgICAgICAgIGlmIChldmVudFJlc3VsdCA9PSBmYWxzZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChldmVudFJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpIHtcclxuICAgICAgICAgICAgICAgIGV2ZW50UmVzdWx0ID0gYXdhaXQgZXZlbnRSZXN1bHQ7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnRSZXN1bHQgPT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJvdXRlLnRlbXBsYXRlVXJsKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmVzdWx0ID0gW107XHJcbiAgICAgICAgICAgICAgICBsZXQgaSA9IDAsIGlkeDogbnVtYmVyO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWVzID0gQXJyYXkuZnJvbShyb3V0ZS5wYXJhbU1hcC52YWx1ZXMoKSk7XHJcbiAgICAgICAgICAgICAgICBmb3IobGV0IHBpZWNlIG9mIHJvdXRlLnRlbXBsYXRlVXJsLnNwbGl0KC97LykpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZHggPSBwaWVjZS5pbmRleE9mKFwifVwiKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaWR4ICE9IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKHZhbHVlc1tpKytdICsgcGllY2Uuc3Vic3RyaW5nKGlkeCArIDEsIHBpZWNlLmxlbmd0aCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKHBpZWNlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHJlc3VsdC5qb2luKFwiXCIpLCB7IG1ldGhvZDogXCJnZXRcIiB9KTtcclxuICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uRXJyb3JIYW5kbGVyKGFyZ3MpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcm91dGUuZWxlbWVudC5pbm5lckhUTUwgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50LmVsZW1lbnQuc3R5bGVbXCJkaXNwbGF5XCJdID0gXCJjb250ZW50c1wiO1xyXG4gICAgICAgICAgICBldmVudFJlc3VsdCA9IHRoaXMub25OYXZpZ2F0ZUhhbmRsZXIoYXJncyk7XHJcbiAgICAgICAgICAgIGlmIChldmVudFJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IGV2ZW50UmVzdWx0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBhcmdzO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudCA9IG51bGw7XHJcbiAgICAgICAgICAgIGNvbnN0IGFyZ3MgPSB0aGlzLmJ1aWxkUm91dGVFdmVudEFyZ3MobnVsbCwgZXZlbnQpO1xyXG4gICAgICAgICAgICB0aGlzLm9uRXJyb3JIYW5kbGVyKGFyZ3MpO1xyXG4gICAgICAgICAgICByZXR1cm4gYXJncztcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBidWlsZFJvdXRlRXZlbnRBcmdzKHJvdXRlOiBJUm91dGUsIGV2ZW50OiBIYXNoQ2hhbmdlRXZlbnQpOiBSb3V0ZUV2ZW50QXJncyB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcm91dGU6IHJvdXRlID09IG51bGwgPyBudWxsIDogcm91dGUucm91dGUsIFxyXG4gICAgICAgICAgICBwYXJhbXM6IHJvdXRlID09IG51bGwgPyBudWxsIDogcm91dGUucGFyYW1zLCBcclxuICAgICAgICAgICAgcm91dGVyOiB0aGlzLCBcclxuICAgICAgICAgICAgZWxlbWVudDogcm91dGUgPT0gbnVsbCA/IG51bGwgOiByb3V0ZS5lbGVtZW50LCBcclxuICAgICAgICAgICAgaGFzaENoYW5nZWRFdmVudDogZXZlbnRcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iXX0=
