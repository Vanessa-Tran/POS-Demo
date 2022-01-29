
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    let cache = {}; 

    async function fetchItemDetail(identifier) {
        console.log("fetching item detail");
        let currentTime = new Date();
        let cacheMaxtime = 1 * 60 * 1000;
        
        if (identifier in cache && currentTime.getTime() - cache[identifier].ts < cacheMaxtime) {
            return cache[identifier].data //cacheEntry
        }else {
            let x = await axios.get('http://localhost:8080/' + identifier);
            let jsonresponse = x.data;
            let cacheEntry = {
                data:jsonresponse,
                ts: currentTime.getTime()
            };
            cache[identifier] = cacheEntry; //cacheEntry is a pair of jsontext and timestamp
            return jsonresponse //jsontext
        }
    }

    /* src/App.svelte generated by Svelte v3.38.2 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i].item;
    	child_ctx[17] = list[i].quantity;
    	child_ctx[18] = list[i].discountpc;
    	child_ctx[20] = i;
    	return child_ctx;
    }

    // (69:3) {#if itemdetail !== null}
    function create_if_block(ctx) {
    	let h2;
    	let b;
    	let t0_value = /*itemdetail*/ ctx[1].id + "";
    	let t0;
    	let t1;
    	let t2_value = /*itemdetail*/ ctx[1].name + "";
    	let t2;
    	let t3;
    	let t4_value = /*itemdetail*/ ctx[1].price + "";
    	let t4;
    	let t5;
    	let button0;
    	let t7;
    	let button1;
    	let t9;
    	let button2;
    	let t11;
    	let button3;
    	let t13;
    	let button4;
    	let t15;
    	let button5;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			b = element("b");
    			t0 = text(t0_value);
    			t1 = text(" : ");
    			t2 = text(t2_value);
    			t3 = text(" : ");
    			t4 = text(t4_value);
    			t5 = space();
    			button0 = element("button");
    			button0.textContent = "ADD";
    			t7 = text("\n\t\t\t\t\n\t\t\t\tDiscount:\n\t\t\t\t");
    			button1 = element("button");
    			button1.textContent = "5%";
    			t9 = space();
    			button2 = element("button");
    			button2.textContent = "10%";
    			t11 = space();
    			button3 = element("button");
    			button3.textContent = "15%";
    			t13 = space();
    			button4 = element("button");
    			button4.textContent = "20%";
    			t15 = space();
    			button5 = element("button");
    			button5.textContent = "50%";
    			add_location(b, file, 70, 5, 1598);
    			add_location(h2, file, 69, 4, 1588);
    			add_location(button0, file, 74, 4, 1689);
    			add_location(button1, file, 77, 4, 1769);
    			add_location(button2, file, 78, 4, 1830);
    			add_location(button3, file, 79, 4, 1891);
    			add_location(button4, file, 80, 4, 1953);
    			add_location(button5, file, 81, 4, 2014);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			append_dev(h2, b);
    			append_dev(b, t0);
    			append_dev(b, t1);
    			append_dev(b, t2);
    			append_dev(b, t3);
    			append_dev(b, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, button1, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, button2, anchor);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, button3, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, button4, anchor);
    			insert_dev(target, t15, anchor);
    			insert_dev(target, button5, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[9], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[10], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[11], false, false, false),
    					listen_dev(button3, "click", /*click_handler_3*/ ctx[12], false, false, false),
    					listen_dev(button4, "click", /*click_handler_4*/ ctx[13], false, false, false),
    					listen_dev(button5, "click", /*click_handler_5*/ ctx[14], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*itemdetail*/ 2 && t0_value !== (t0_value = /*itemdetail*/ ctx[1].id + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*itemdetail*/ 2 && t2_value !== (t2_value = /*itemdetail*/ ctx[1].name + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*itemdetail*/ 2 && t4_value !== (t4_value = /*itemdetail*/ ctx[1].price + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(button2);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(button3);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(button4);
    			if (detaching) detach_dev(t15);
    			if (detaching) detach_dev(button5);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(69:3) {#if itemdetail !== null}",
    		ctx
    	});

    	return block;
    }

    // (87:3) {#each pendingItems as {item, quantity, discountpc}
    function create_each_block(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*item*/ ctx[16].id + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*quantity*/ ctx[17] + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4_value = /*discountpc*/ ctx[18] * 100 + "";
    	let t4;
    	let t5;
    	let t6;
    	let td3;
    	let t7;
    	let t8_value = /*item*/ ctx[16].price * /*quantity*/ ctx[17] * (1 - /*discountpc*/ ctx[18]) + "";
    	let t8;
    	let t9;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = text("%");
    			t6 = space();
    			td3 = element("td");
    			t7 = text("$");
    			t8 = text(t8_value);
    			t9 = space();
    			add_location(td0, file, 90, 5, 2403);
    			add_location(td1, file, 91, 5, 2427);
    			add_location(td2, file, 92, 5, 2452);
    			add_location(td3, file, 93, 5, 2484);
    			add_location(tr, file, 88, 4, 2349);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, t4);
    			append_dev(td2, t5);
    			append_dev(tr, t6);
    			append_dev(tr, td3);
    			append_dev(td3, t7);
    			append_dev(td3, t8);
    			append_dev(tr, t9);

    			if (!mounted) {
    				dispose = listen_dev(
    					tr,
    					"click",
    					function () {
    						if (is_function(/*SelectItem*/ ctx[6](/*item*/ ctx[16], /*quantity*/ ctx[17]))) /*SelectItem*/ ctx[6](/*item*/ ctx[16], /*quantity*/ ctx[17]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*pendingItems*/ 4 && t0_value !== (t0_value = /*item*/ ctx[16].id + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*pendingItems*/ 4 && t2_value !== (t2_value = /*quantity*/ ctx[17] + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*pendingItems*/ 4 && t4_value !== (t4_value = /*discountpc*/ ctx[18] * 100 + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*pendingItems*/ 4 && t8_value !== (t8_value = /*item*/ ctx[16].price * /*quantity*/ ctx[17] * (1 - /*discountpc*/ ctx[18]) + "")) set_data_dev(t8, t8_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(87:3) {#each pendingItems as {item, quantity, discountpc}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div4;
    	let h1;
    	let t1;
    	let div3;
    	let div0;
    	let input;
    	let t2;
    	let t3;
    	let div2;
    	let table;
    	let t4;
    	let div1;
    	let t5;
    	let t6;
    	let t7;
    	let button0;
    	let t9;
    	let button1;
    	let mounted;
    	let dispose;
    	let if_block = /*itemdetail*/ ctx[1] !== null && create_if_block(ctx);
    	let each_value = /*pendingItems*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			h1 = element("h1");
    			h1.textContent = "VANESSA'S STORE!";
    			t1 = space();
    			div3 = element("div");
    			div0 = element("div");
    			input = element("input");
    			t2 = space();
    			if (if_block) if_block.c();
    			t3 = space();
    			div2 = element("div");
    			table = element("table");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			div1 = element("div");
    			t5 = text("TOTAL: $");
    			t6 = text(/*total*/ ctx[3]);
    			t7 = space();
    			button0 = element("button");
    			button0.textContent = "CASH";
    			t9 = space();
    			button1 = element("button");
    			button1.textContent = "EFTPOS";
    			attr_dev(h1, "class", "svelte-1b0f6h9");
    			add_location(h1, file, 63, 1, 1393);
    			attr_dev(input, "placeholder", "enter item id pls");
    			add_location(input, file, 66, 3, 1472);
    			attr_dev(div0, "id", "firstsection");
    			attr_dev(div0, "class", "svelte-1b0f6h9");
    			add_location(div0, file, 65, 2, 1445);
    			attr_dev(table, "id", "pendingItemtable");
    			attr_dev(table, "class", "svelte-1b0f6h9");
    			add_location(table, file, 85, 3, 2115);
    			attr_dev(button0, "class", "svelte-1b0f6h9");
    			add_location(button0, file, 99, 4, 2613);
    			attr_dev(button1, "class", "svelte-1b0f6h9");
    			add_location(button1, file, 100, 4, 2658);
    			attr_dev(div1, "id", "endcontent");
    			attr_dev(div1, "class", "svelte-1b0f6h9");
    			add_location(div1, file, 97, 3, 2567);
    			attr_dev(div2, "id", "orderinfo");
    			attr_dev(div2, "class", "svelte-1b0f6h9");
    			add_location(div2, file, 84, 2, 2091);
    			attr_dev(div3, "id", "maincontent");
    			attr_dev(div3, "class", "svelte-1b0f6h9");
    			add_location(div3, file, 64, 1, 1420);
    			attr_dev(div4, "id", "page");
    			attr_dev(div4, "class", "svelte-1b0f6h9");
    			add_location(div4, file, 62, 0, 1376);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, h1);
    			append_dev(div4, t1);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, input);
    			set_input_value(input, /*idsearch*/ ctx[0]);
    			append_dev(div0, t2);
    			if (if_block) if_block.m(div0, null);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, table);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(table, null);
    			}

    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, t5);
    			append_dev(div1, t6);
    			append_dev(div1, t7);
    			append_dev(div1, button0);
    			append_dev(div1, t9);
    			append_dev(div1, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "keyup", /*sendID*/ ctx[4], false, false, false),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[8]),
    					listen_dev(button0, "click", /*clear*/ ctx[7], false, false, false),
    					listen_dev(button1, "click", /*clear*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*idsearch*/ 1 && input.value !== /*idsearch*/ ctx[0]) {
    				set_input_value(input, /*idsearch*/ ctx[0]);
    			}

    			if (/*itemdetail*/ ctx[1] !== null) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*SelectItem, pendingItems*/ 68) {
    				each_value = /*pendingItems*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(table, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*total*/ 8) set_data_dev(t6, /*total*/ ctx[3]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let idsearch = "";
    	let itemdetail = null;
    	let pendingItems = [];
    	let total = 0;

    	async function sendID(event) {
    		if (event.key === "Enter") {
    			console.log("sending " + idsearch);
    			$$invalidate(1, itemdetail = await fetchItemDetail(idsearch));
    		}
    	}

    	function addToPurchase(discount) {
    		// Search for existing item
    		let foundItem = false;

    		for (const li of pendingItems) {
    			if (li.item.id === itemdetail.id && li.discountpc === discount) {
    				li.quantity += 1;
    				foundItem = true;
    				$$invalidate(2, pendingItems = pendingItems); //update UI
    			}
    		}

    		if (foundItem === false) {
    			console.log("Adding Item");

    			let lineitem = {
    				item: itemdetail,
    				quantity: 1,
    				discountpc: discount
    			}; //creating lineitem object to save the items in line and keep the unchange of item details. 

    			console.log(lineitem);
    			$$invalidate(2, pendingItems = [lineitem, ...pendingItems]);
    		}

    		console.log(pendingItems);
    		CalcTotalPrice();
    	}

    	async function SelectItem(item, qty) {
    		console.log("Selecting item: " + item.id);
    		$$invalidate(1, itemdetail = await fetchItemDetail(item.id));
    	} //itemdetail = item

    	function CalcTotalPrice() {
    		$$invalidate(3, total = 0);

    		pendingItems.forEach(pendingItem => {
    			$$invalidate(3, total = total + pendingItem.item.price * pendingItem.quantity * (1 - pendingItem.discountpc));
    		});
    	}

    	function clear() {
    		$$invalidate(2, pendingItems = []);
    		CalcTotalPrice();
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		idsearch = this.value;
    		$$invalidate(0, idsearch);
    	}

    	const click_handler = () => addToPurchase(0);
    	const click_handler_1 = () => addToPurchase(0.05);
    	const click_handler_2 = () => addToPurchase(0.1);
    	const click_handler_3 = () => addToPurchase(0.15);
    	const click_handler_4 = () => addToPurchase(0.2);
    	const click_handler_5 = () => addToPurchase(0.5);

    	$$self.$capture_state = () => ({
    		fetchItemDetail,
    		idsearch,
    		itemdetail,
    		pendingItems,
    		total,
    		sendID,
    		addToPurchase,
    		SelectItem,
    		CalcTotalPrice,
    		clear
    	});

    	$$self.$inject_state = $$props => {
    		if ("idsearch" in $$props) $$invalidate(0, idsearch = $$props.idsearch);
    		if ("itemdetail" in $$props) $$invalidate(1, itemdetail = $$props.itemdetail);
    		if ("pendingItems" in $$props) $$invalidate(2, pendingItems = $$props.pendingItems);
    		if ("total" in $$props) $$invalidate(3, total = $$props.total);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		idsearch,
    		itemdetail,
    		pendingItems,
    		total,
    		sendID,
    		addToPurchase,
    		SelectItem,
    		clear,
    		input_input_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
