//OpenAjax Hub v1.0 -- slightly modified version
if(!window.OpenAjax){OpenAjax=new function(){var b=true;var i=false;var d=window;var e;var a="org.openajax.hub.";var c={};this.hub=c;c.implementer="http://openajax.org";c.implVersion="1.0";c.specVersion="1.0";c.implExtraData={};var e={};c.libraries=e;c.registerLibrary=function(j,h,g,f){e[j]={prefix:j,namespaceURI:h,version:g,extraData:f};this.publish(a+"registerLibrary",e[j])};c.unregisterLibrary=function(f){this.publish(a+"unregisterLibrary",e[f]);delete e[f]};c._subscriptions={c:{},s:[]};c._cleanup=[];c._subIndex=0;c._pubDepth=0;c.subscribe=function(f,n,k,j,h){if(!k){k=window}var l=f+"."+this._subIndex;var g={scope:k,cb:n,fcb:h,data:j,sid:this._subIndex++,hdl:l};var m=f.split(".");this._subscribe(this._subscriptions,m,0,g);return l};c.publish=function(f,h){var j=f.split(".");this._pubDepth++;this._publish(this._subscriptions,j,0,f,h);this._pubDepth--;if((this._cleanup.length>0)&&(this._pubDepth==0)){for(var g=0;g<this._cleanup.length;g++){this.unsubscribe(this._cleanup[g].hdl)}delete (this._cleanup);this._cleanup=[]}};c.unsubscribe=function(g){var h=g.split(".");var f=h.pop();this._unsubscribe(this._subscriptions,h,0,f)};c._subscribe=function(f,k,g,j){var h=k[g];if(g==k.length){f.s.push(j)}else{if(typeof f.c=="undefined"){f.c={}}if(typeof f.c[h]=="undefined"){f.c[h]={c:{},s:[]};this._subscribe(f.c[h],k,g+1,j)}else{this._subscribe(f.c[h],k,g+1,j)}}};c._publish=function(s,r,m,f,g){if(typeof s!="undefined"){var h;if(m==r.length){h=s}else{this._publish(s.c[r[m]],r,m+1,f,g);this._publish(s.c["*"],r,m+1,f,g);h=s.c["**"]}if(typeof h!="undefined"){var n=h.s;var q=n.length;for(var k=0;k<q;k++){if(n[k].cb){var p=n[k].scope;var j=n[k].cb;var l=n[k].fcb;var o=n[k].data;if(typeof j=="string"){j=p[j]}if(typeof l=="string"){l=p[l]}if((!l)||(l.call(p,g,f,o))){j.call(p,g,f,o)}}}}}};c._unsubscribe=function(o,n,j,g){if(typeof o!="undefined"){if(j<n.length){var f=o.c[n[j]];this._unsubscribe(f,n,j+1,g);if(f.s.length==0){for(var m in f.c){return}delete o.c[n[j]]}return}else{var k=o.s;var l=k.length;for(var h=0;h<l;h++){if(g==k[h].sid){if(this._pubDepth>0){k[h].cb=null;this._cleanup.push(k[h])}else{k.splice(h,1)}return}}}}}};OpenAjax.hub.registerLibrary("OpenAjax","http://openajax.org/hub","1.0",{})};

/*global Kiwi, $k, $m, $v, $c, $, OpenAjax, window*/

//Prototypical inheritance
if (typeof Object.create !== 'function') {
     Object.create = function (o) {
         var F = function () {};
         F.prototype = o;
         return new F();
     };
}

var Kiwi = {
  m: {},
  v: {},
  c: {},
  h: {},
  options: {
    base_url: 'http://'+window.location.host,
    global_error_handler: {base: function(message, error_code, xhr){}}
  }    
};

//Connector Object
Kiwi.Connector = function(model){
  this.model = model;  
};

Kiwi.Connector.prototype = {
  get: function(params, after_success, after_error, options){
    return this.http_request(null, 'get', params, after_success, after_error, options);
  },
  
  post: function(params, after_success, after_error, options){
    return this.http_request(null, 'post', params, after_success, after_error, options);
  },
  
  put: function(params, after_success, after_error, options){
    return this.http_request(null, 'put', params, after_success, after_error, options);
  },
  
  destroy: function(after_success, after_error, options){
    return this.http_request(null, 'delete', {}, after_success, after_error, options);
  },
  
  uri: function(uri, model){
     if (!model) {model = this.model;}
     return Kiwi.Parser.get_recursive_uri(uri, model);
  },  
  http_request: function(uri, method, params, after_success, after_error, options){
    params = params || {}
    var request = typeof Kiwi.__request__ == 'undefined' ? false : Kiwi.__request__;
    if (request){
      params = request.query_params = Kiwi.Parser.objectify_params(params)
    }
    after_error = after_error || Kiwi.Parser.get_error_handler(request);
    var server_request_handler = new Kiwi.ServerRequestHandler(after_success, after_error, request);
    if (!uri) {uri = Kiwi.options.base_url + this.uri();}  
    options = $.extend({
      type: method,
      data: Kiwi.Parser.serialize_params(params),
      dataType: 'json',
      url: uri,
      cache: false,
      beforeSend: function(){
        if (request) {request.before_ajax_call();}
      },
      complete: function(xhr){
        if (request) {request.after_ajax_call();}        
      },
      success: function(data, status){
        server_request_handler.success.apply(request || this, [data]);
      },
      error: function(xhr, status_message){
        server_request_handler.error(xhr, status_message);
      }
    }, options || {});
    $.ajax(options);  
  }    
};

//Server Request Handler Object -- good for errors
Kiwi.ServerRequestHandler = function(success_handler, error_handler, request){
  //Success handler is always passed, error handler is an object with a map of http error codes to functions or a function under the key 'all', can be a function too
  this.success = success_handler;
  this.error_handler =  error_handler || {};
  this.request = request
};

Kiwi.ServerRequestHandler.prototype = {
  error: function(xhr, status_message){
    
    var context = this.request ? this.request.view : this
    
    //If error handler is a function, execute it and return
    if (typeof this.error_handler === 'function'){
      this.error_handler.apply(window, [xhr, status_message]);
      return;
    }
   var message = "";
    //TODO ADD dealing with 0 from local response
    switch (xhr.status){
      //If status is 0 no connection was made to server
      case 0:
        message = "Could not contact the server, please make sure you are connected to the Internet.";
        break;
      case 200:
        //If 200, then either parsererror or timeout
        message = status_message === 'timeout' ? "The connection to the server timed out." : "There was a problem with the server response.";
        break;
      default:
        message = eval("("+ (xhr.responseText) +")");
    }
     
    var args = [message, xhr.status, xhr];
       
    //Call custom universal error handler if passed in the request
    if (this.error_handler.all){
      this.error_handler.all.apply(context, args);
      return;
    }    
    //Call custom by-error-code handler if passed in the request
    if(this.error_handler[xhr.status]){
      this.error_handler[xhr.status].apply(context, args);
      return;
    }
    //Call by-error-code global error handler
    if (Kiwi.options.global_error_handler[xhr.status]){
      Kiwi.options.global_error_handler[xhr.status].apply(context, args);
    }
            
    //Call base global error handler
    Kiwi.options.global_error_handler.base.apply(context, args);
  }
};

//Parser object
Kiwi.Parser = {
  //this will only recognize arrays that are created in the same context (or window or frame)
  typeOf: function typeOf(value) {
    var s = typeof value;
    if (s === 'object') {
      if (value) {
        if (value instanceof Array) {
          s = 'array';
        }
      } else {
        s = 'null';
      }
    }
    return s;
  },
  get_event_name: function(string){
    return string.substring(string.lastIndexOf(" ") + 1);
  },
  get_selector: function(string, view){
    var selector = string.substring(0, string.lastIndexOf(" "))
    if(string.indexOf("::") == -1){
      selector = view.node.selector + " " + selector; 
    } else {
      selector = selector.substring(2)
    }
    return selector
  },
  get_handler: function(string, object){
    //If 'http://' or 'https://' is encountered, assume a redirect
    if (string.indexOf("http://") != -1 || string.indexOf("https://") != -1){
      return {klass: {type: 'external'}, action: function(){window.location = string}}
    }    
    //If a period is encountered assume a controller and get action, if not assume current view or helper
    if (string.indexOf(".") != -1){
      var a = string.split(".");
      var controller = a[0];
      var action = a[1];
      //Before filter
      var filter = function(){};
      if (Kiwi.c[controller].before){
         var filter_definition = Kiwi.c[controller].before
        if (Kiwi.Parser.typeOf(filter_definition) == 'array'){
          if ($.inArray(action, filter_definition[0]) != -1){
            filter = Kiwi.c[controller][filter_definition[1]]
          }
        } else {
         filter = Kiwi.c[controller][filter_definition]
        }
      }      
      return {klass: Kiwi.c[controller], action: Kiwi.c[controller][action], action_name: action, filter: filter};      
    } else {
      action = string;
      //If action is not found in current object, assume a helper
      if (!object[action]){
        object = Kiwi.helpers.prototype
      }
      return {klass: object, action: object[action], action_name: action};
    }
  },
  get_error_handler: function(request){
    if (!request) return new Function
    var option = request.options.on_error 
    if (this.typeOf(option) === 'null'){return null}
    if (this.typeOf(option) === 'object'){return option}
    if (this.typeOf(option) === 'string'){return request.view[option]}
    return false
  },
  get_recursive_uri: function(uri, model){
    if (!uri) {uri = "";}
    uri =  model.uri() + uri;
    if (model.parent) {uri = this.get_recursive_uri(uri, model.parent);}
    return uri;
  },
  serialize_object : function(value, prefix) {
    var retval_array = [];
    var retval = null
    var prefix = prefix || "";
    switch(this.typeOf(value)){
      case 'array':
        for (var i = 0; i < value.length; i++){
          var element = this.serialize_object(value[i], prefix+'[]')
          if (element !== null){retval_array.push(element);}           
        }
        retval = retval_array.length ? retval_array.join("&") : null;
        break;
      case 'object':
        for (key in value){
          var element = this.serialize_object(value[key], prefix ? prefix+'['+encodeURIComponent(key)+']' : encodeURIComponent(key))
          if (element !== null){retval_array.push(element);} 
        }
        retval = retval_array.length ? retval_array.join("&") : null;
        break;
      case 'null':
        break;
      default:
        retval = prefix+'='+encodeURIComponent(value) ;
      }
    return retval;
  },
  objectify_form: function(jquery, prefix){
    //adapted from jquery.js
    var retval
    var object = {}    
    jquery.map(function(){
			return this.elements ? jQuery.makeArray(this.elements) : this;
		})
		.filter(function(){
			return this.name && !this.disabled &&
				(this.checked || /select|textarea/i.test(this.nodeName) ||
					/text|hidden|password|search/i.test(this.type));
		})
		.each(function(i, elem){
			var val = jQuery(this).val();
			if (val !== null){
			  if (elem.name.match(/\[\]$/)){
			    //ignore empty strings here
          if (val == ""){return;}
			    var key = elem.name.slice(0,-2)
          object[key] ? object[key].push(val) : object[key] = [val]
			  } else {
			    object[elem.name] = val
			  }			
			}				
		})		
    if (prefix){
      retval = {}
      retval[prefix] = object
    } else {
      retval = object
    }
    return retval
  },
  objectify_params: function(params){
    //non jquery objects pass right through
    var object = params
    if (typeof params === 'function'){object = params.call(Kiwi.__request__)}
    if (params instanceof jQuery){object = this.objectify_form(params)}
    return object
  },
  serialize_params: function(params){
    //strings pass right through
    if (typeof params !== 'string'){
      params = this.serialize_object(this.objectify_params(params))
    }
    return params
  },
  make_broadcast_name: function(handler){
    return handler.klass.name + "." + handler.action_name;
  },
  get_unix_timestamp: function(){
    return parseInt(new Date().getTime().toString(), 10);    
  },
  get_object_length: function(object){
     var i = 0;
     $.each(object, function(){
       i ++;
     });
     return i;
   }  
};

//Request object -- handles persistence through action chain
Kiwi.Request = function(listened, event, view, options, callback){
  var that = this;
  this.event = event;
  this.view = view;
  this.options = options;
  this.data = {};
  this.handler = Kiwi.Parser.get_handler(this.options.action, this.view);
  this.current_ajax_calls = 0;
  this.id = Kiwi.Parser.get_unix_timestamp();
  this.stopper = null;
  this.target = $(this.event.target);
  this.listened = $(listened)
  this.__callback = callback
  //Sets up auto-id
  $.each(this.listened.get(0).attributes, function(){
    if (this.nodeName.indexOf("_id") !== -1){
      that[this.nodeName] = parseInt(this.nodeValue);
    }
  })
};

Kiwi.Request.prototype = {
  continue_to: function(follow_up){
    var self = this; 
    
    return function(data){
      self.data = data;
      self.handler = Kiwi.Parser.get_handler(self.handler.klass.name+'.'+follow_up, self.handler.klass);
      Kiwi.__request__ = self;
      self.execute_action();
      if (self.current_ajax_calls === 0) {self.clean_up();}
      delete Kiwi.__request__;
    };    
  },
  publish: function(data){
    this.data = data;
    var broadcast_name = Kiwi.Parser.make_broadcast_name(this.handler);
    if (this.options.subscribe) {
      this.view[this.options.callback].apply(this.view, [this], broadcast_name)
    }
    OpenAjax.hub.publish(broadcast_name, this);
  },
  params: function(){
    //assumes only one form per view
    return Kiwi.Parser.objectify_form($("form", this.options.param_context || this.view.node), this.options.param_prefix)
  }, 
  execute_action: function(){
    try{
      this.view.current_requests[this.id] = this;
      if (this.handler.klass.type === 'view' || this.handler.klass.type === 'helper') {        
        //Run view method or helper
        this.handler.action.apply(this.view, [this]);
      } else {
         //Provide shortcut to controller
         //TODO need to provide a straightforward way if chaining controller actions without ajax while keeping the request alive
         this.controller = this.handler.klass
         //Run before filter and controller action
         this.handler.filter.apply(this);
         this.handler.action.apply(this);
      }
    } catch (thrown) {
      if (thrown == 'halt'){return;}
    }
  },
  before_ajax_call: function(){
    if (this.options.before_each_ajax_call) {Kiwi.Parser.get_handler(this.options.before_each_ajax_call, this.view).action.apply(this.view, [this])}
    this.current_ajax_calls++;
    if (this.options.unbind && this.current_ajax_calls === 1) {this.put_event_stopper();}
    if (this.options.show_loader) {this.view.show_loader();}
  },
  after_ajax_call: function(){
    this.current_ajax_calls--;
    //Do anything that should be done after each ajax
    if (this.options.after_each_ajax_call) {Kiwi.Parser.get_handler(this.options.after_each_ajax_call, this.view).action.apply(this.view, [this])}
    //Do anything that has been defined after all ajax calls (on a per view basis)
    if (this.current_ajax_calls === 0){
      if (this.options.unbind) {this.lift_event_stopper();}
      if (this.view.count_requests() === 1) {
        var after_callback = this.options.after_all_ajax_calls || this.view.hide_loader;
        after_callback.apply(this.view);
      }
      this.clean_up();
    }
  },
  clean_up: function(){
    this.destroy_self()
  },
  destroy_self: function(){
    delete this.view.current_requests[this.id];
  },
  put_event_stopper: function(){
    //Stops propagation temporarily so that event delegation halts
    if (this.options.live){
      this.stopper = function(e){e.stopImmediatePropagation(); return false;};
      $(this.event.target).bind(this.event.type, this.stopper);
    } else {
      this.listened.unbind(this.event.type, this.__callback)
    }
  },
  lift_event_stopper: function(){
    //Unbinds stopper, delegation works again
    if (this.options.live){
      $(this.event.target).unbind(this.event.type, this.stopper); 
    } else {
      this.listened.bind(this.event.type, this.__callback)
    }      
  }
};

//Model
Kiwi.m = function(name, a, b){
  var model
  if (typeof a == 'string'){
    var parent_associations = Kiwi.m[a].has
    model = b
  } else {
    model = a
  }
  var new_model = Object.create(Kiwi.m.prototype);
  new_model.name = name;
  new_model.connector = new Kiwi.Connector(new_model);
  $.extend(model.has, parent_associations)
  Kiwi.m[name] = $.extend(new_model, model);  
};

// Model methods
Kiwi.m.prototype = {
  name: null,
  type: 'model',
  connector: null,
  has: {},
  bound: false,
  find: function(identifier, a, b, c, d){
    //If identifier is number, interpret as id, no params
    if (typeof identifier === 'number'){
      var model = this.id(identifier);
      var after_success = a;
      var after_error = b;
      var options = c;
      return after_success ? model.connector.get(null, after_success, after_error, options) : model;
    } else if (identifier === 'all'){
      if (typeof a === 'function'){
        //If a is function interpret as as success and assume no params
        after_success = a;
        after_error = b;
        options = c;
        return this.connector.get(null, after_success, after_error, options);
      } else {
        var params = a;
        after_success = b;
        after_error = c;
        options = d;
        return this.connector.get(params, after_success, after_error, options);
      }      
    }    
  },
  
  create: function(params, after_success, after_error, options){
    if (!this.bound) {return this.connector.post(params, after_success, after_error, options);}
  },
  
  update: function(params, after_success, after_error, options){
    if (this.bound) {return this.connector.put(params, after_success, after_error, options);}
  },
  
  destroy: function(after_success, after_error, options){
    if (this.bound) {return this.connector.destroy(after_success, after_error, options);}
  },  
  uri: function(){
    var uri = "";
    if (typeof this.id === 'number'){
      uri = "/" + this.id + uri;
    } 
    uri = "/" + this.resource + uri;
    return uri;
  },
  
  //Binds a model to a specific object
  id: function(id){
    var model =  $.extend({}, this, {id: id});
    model.bound = true;
    //Replace connector
    model.connector = new Kiwi.Connector(model);
    //Associations
    $.each(model.has, function(key, name){
      var related_model = Object.create(Kiwi.m[name])
      related_model.parent = model
      related_model.connector = new Kiwi.Connector(related_model);
      model[key] = related_model;
    });
    return model;    
  }
};  

//Controller
Kiwi.c = function(name, controller){
  var new_controller = Object.create(Kiwi.c.prototype);
  new_controller.name = name;
  Kiwi.c[name] = $.extend(new_controller, controller);
};

Kiwi.c.prototype = {
  name: null,
  type: 'controller'
};

//Views
Kiwi.v = function(name, a, b){
  if (typeof a == 'string'){
    var parent = Kiwi.v[a]
    var view = b
    var deep = true
  } else {
    var parent = Kiwi.v.prototype
    var view = a
    var deep = false
  }
  var new_view = Object.create(parent);
  new_view.name = name;
  $.extend(new_view, view) 
  if (deep){
    //Deep cloning with jQuery overwrites parent, clone listeners manually -- investigate
    new_view.listeners = Object.create(parent.listeners)
    $.extend(new_view.listeners, view.listeners)
    //Add reference to parent
    new_view.parent = parent
  }
  Kiwi.v[name] = new_view
};

Kiwi.v.prototype = {
  name: null,
  type: 'view',
  node: null,
  options: null,
  data: null,
  listeners: {},
  initialize: function(node, options, data){
    var view = Object.create(this);
    view.node = node;
    view.subscriptions = {},
    view.options = options || {};
    view.data = data || {};
    view.current_requests = {};
    view.register_listeners(view.listeners);
    view.initialize_partials();
    view.initialize_loader();
    view.prototype = this
    if (view.initialize_with) {view.initialize_with();}
    return view;
  },
  update: function(){},
  register_listeners: function(listeners){    
    var view = this;    
    $.each(listeners, function(key, value){  
      view.register_listener(key,value)
    });
  },
  register_listener: function(key, value){
    var view = this;    
    if (Kiwi.Parser.typeOf(value) !== 'array'){value = [value]}
    $.each(value, function(index, options){
      var callback = view.__general_callback(options)            
      var selector = Kiwi.Parser.get_selector(key, view);
      var event_name = Kiwi.Parser.get_event_name(key);
      view.bind(selector, event_name, callback, callback.options.live);
    })
  },
  __general_callback: function(options){
    var view = this
    if (typeof options === 'string'){
      options = {action: options};
    }
    options = $.extend({callback: 'update', subscribe: true, on_error: null, show_loader: true, unbind: true, prevent_default: true, live: true}, options);
    
    var callback = function(event){    
      
      //clone the options object: this avoids changes in the options within a request to affect future requests
      request_options = Object.create(options)
      
      if(request_options.prevent_default){event.preventDefault()}
            
      Kiwi.__request__ = new Kiwi.Request(this, event, view, request_options, arguments.callee);

      Kiwi.__request__.execute_action();      

      //If request has ajax call cleanup is delegated to post ajax request routine
      if (Kiwi.__request__.current_ajax_calls === 0) {Kiwi.__request__.clean_up();}        

      delete Kiwi.__request__;
 
    }
    //These are the original options passed to callback
    callback.options = options  
    return callback    
  }, 
  trigger_request_with: function(action, options){
    options = $.extend({unbind: false}, options)
    options.action = action
    var fake_event = $.Event("click")
    fake_event.target = $('body').get(0)
    this.__general_callback(options).call(fake_event.target, fake_event)
  },
  subscribe_to: function(broadcast_name, callback_name){
    callback_name = callback_name || 'update';
    OpenAjax.hub.subscribe(broadcast_name, this[callback_name], this);
    this.subscriptions[broadcast_name] = callback_name
  },
  bind: function(full_selector, event_name, callback, live) {
    live && !(event_name == "submit") ? $(full_selector).live(event_name, callback) : $(full_selector).bind(event_name, callback)
  },
  initialize_partials: function(){
    var view = this;
    view.partials = []
    $.each(view.node.next('.partials').children(), function(){
      if ($(this)[0].className == "") {return;}
      var template = $(this).clone();
      template.render_with = function(data, exclude, strict_recurse){
        return Kiwi.helpers.prototype.render_with(this, data, exclude, strict_recurse)
      }
      view.partials[($(this)[0].className.split(" ")[0])] = template     
    });
  },
  initialize_loader: function(){
    this.loader = $('.loader', this.node);
  },
  show_loader: function(){
    this.loader.show();

  },
  hide_loader: function(){
    this.loader.hide();
  },
  count_requests: function(){
    return Kiwi.Parser.get_object_length(this.current_requests);
  }
};

Kiwi.helpers = function(helpers){
  Kiwi.helpers.prototype = $.extend(Kiwi.helpers.prototype, helpers)
}

Kiwi.helpers.prototype = {
  type: 'helper',
  render_with: function(template, data, exclude) {
    var new_node = template.clone();
    //The text inside node with a class that matches the name of a key in 'data' will be set to the corresponding value
    //If the node is an img, then the src attribute will be set to the value, if a link, href will be set to the value
    data = data || {};
    exclude = exclude || [];
    var insert = function(data){
      $.each(data, function(key, value){
        if (value !== null && Kiwi.Parser.typeOf(value) === 'object') {
        } else {
          if ($.inArray(key, exclude) != -1){return;}
          var selector = '.'+ key
          $(selector, new_node).each(function(){
            var node_name = $(this)[0].nodeName;
            switch (node_name) {
              case "IMG":
               $(this).attr("src", value);
               break;
              case "A":
               $(this).attr("href", value);
               break;
              case "INPUT":
               $(this).val(value)
               break;
              default:
               $(this).text(value);              
            }           
          })
        }
      })
    }
    insert(data)        
    return new_node;
  }
}

Kiwi.h = new Kiwi.helpers

//For jQuery feel
var $k = Kiwi;
var $h = Kiwi.h;
var $m = Kiwi.m;
var $v = Kiwi.v;
var $c = Kiwi.c;