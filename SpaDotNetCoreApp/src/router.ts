﻿export interface IRoute {
    route: string;
    element: HTMLElement;
    defaultParams: Record<string, any>;
    paramMap: Map<string, any>;
    params: Record<string, any>;
}

type RouteEventArgs = {
    route: string;
    params: Record<string, any>;
    router: Router;
    element: HTMLElement;
    hashChangedEvent: HashChangeEvent;
};

type RouterCtorArgs = {
    element?: Element;
    hashChar?: string;
    test?: (route: string) => boolean;
    renderPlugins?: Array<(route: IRoute, errorHandler: ()=>void) => void | Promise<void>>;
}

type ErrorEvent = (event: RouteEventArgs) => void;
type RouteEvent = (event: RouteEventArgs) => void | boolean | Promise<void> | Promise<boolean>;

export class Router {
    private hashChar: string;
    private renderPlugins: Array<(route: IRoute, errorHandler: ()=>void) => void | Promise<void>>;
    private onErrorHandler: ErrorEvent = event => {throw new Error(`Unknown route: ${event.hashChangedEvent.newURL}`)};
    private onBeforeNavigateHandler: RouteEvent = route => {};
    private onBeforeLeaveHandler: RouteEvent = route => {};
    private onNavigateHandler: RouteEvent = route => {};
    private onLeaveHandler: RouteEvent = route => {};

    public current: IRoute;
    public routes: Record<string, IRoute>;

    constructor(args: RouterCtorArgs = {}) {
        args = Object.assign({
            element: document.body,
            hashChar: "#",
            test: ((r: string) => /^[A-Za-z0-9_@()/.-]*$/.test(r)),
            renderPlugins: []
        }, args);
        this.hashChar = args.hashChar;
        this.renderPlugins = args.renderPlugins;
        this.routes = {};
        for(let e of args.element.querySelectorAll("[data-route]")) {
            let element = (e as HTMLElement), route = element.dataset["route"] as string;
            if (!args.test(route)) {
                throw new Error(`Invalid route definition: ${route}`);
            }
            if (!route.startsWith("/")) {
                throw new Error(`Invalid route definition: ${route}`);
            }
            let defaultParams = {}, paramMap = null;
            const p = element.dataset["routeParams"] as string, params = {};
            if (!p) {
                paramMap = new Map<string, any>();
            } else {
                try {
                    defaultParams = JSON.parse(p);
                    paramMap = new Map<string, any>(Object.entries(defaultParams));
                } catch (e) {
                    console.error(`Couldn't deserialize default params for route ${route}: ${e}.\nMake sure that "${p}" is valid JSON...`);
                }
            }
            this.routes[route] = {route, element, defaultParams, paramMap, params};
        }
        
    }

    public start() {
        window.addEventListener("hashchange", event => this.onHashChange(event));
        window.dispatchEvent(new HashChangeEvent("hashchange"));
        return this;
    }

    public onError(event: ErrorEvent) {
        this.onErrorHandler = event;
        return this;
    }

    public onNavigate(event: RouteEvent) {
        this.onNavigateHandler = event;
        return this;
    }

    public onLeave(event: RouteEvent) {
        this.onLeaveHandler = event;
        return this;
    }

    public onBeforeNavigate(event: RouteEvent) {
        this.onBeforeNavigateHandler = event;
        return this;
    }

    public onBeforeLeave(event: RouteEvent) {
        this.onBeforeLeaveHandler = event;
        return this;
    }

    public navigate(route: string) {
        document.location.hash = this.hashChar + route;
        return this;
    }

    public reveal(route: string) {
        return this.revealUri(route, null);
    }

    private onHashChange(event: HashChangeEvent) {
        let hash = document.location.hash;
        if (hash && event.newURL) {
            hash = event.newURL.replace(document.location.origin + document.location.pathname, "");
        }
        hash = hash.replace(document.location.search, "");
        this.revealUri(hash.replace(this.hashChar, ""), event);
    }

    private async revealUri(uri: string, event: HashChangeEvent) {
        const uriPieces = uri.split("/").map(item => decodeURIComponent(item));
        let route: IRoute, candidate: IRoute, test = "";
        let i: number, len: number, sliceIndex: number;
        for (i = 0, len = uriPieces.length; i < len; i++) {
            let piece = uriPieces[i];
            test = test.endsWith("/") ? test + piece : test + "/" + piece;
            candidate = this.routes[test];
            if ((candidate && !route) || (candidate && route.route.length < candidate.route.length)) {
                route = candidate;
                sliceIndex = i + 1;
            }
        }
        let eventResult: void | boolean | Promise<void> | Promise<boolean>;
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
            } else {
                route.params = Object.assign({}, route.defaultParams);
                route.paramMap = new Map<string, any>(Object.entries(route.params));
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
            for(let plugin of this.renderPlugins) {
                let result = plugin(route, () => this.onErrorHandler(args));
                if (result instanceof Promise) {
                    await result;
                }
            }
            this.current.element.style["display"] = "contents";
            eventResult = this.onNavigateHandler(args);
            if (eventResult instanceof Promise) {
                await eventResult;
            }
            return args;
        } else {
            this.current = null;
            const args = this.buildRouteEventArgs(null, event);
            this.onErrorHandler(args);
            return args;
        }
    }

    private buildRouteEventArgs(route: IRoute, event: HashChangeEvent): RouteEventArgs {
        return {
            route: route == null ? null : route.route, 
            params: route == null ? null : route.params, 
            router: this, 
            element: route == null ? null : route.element, 
            hashChangedEvent: event
        }
    }
}