// 功能描述：弹出层
// 依赖jquery
// 必填参数 trigger(触发元素) popupBlk（弹出内容id/类名）
define(function(require, exports, module) {
    var $ = require('jquery');
    Function.prototype.binding = function() {
            if (arguments.length < 2 && typeof arguments[0] == "undefined"){
                return this
            }
            var __method = this,
                args = jQuery.makeArray(arguments),
                object = args.shift();
            return function() {
                return __method.apply(object, args.concat(jQuery.makeArray(arguments)));
            }
        }
        var Class = function(subclass) {
            subclass.setOptions = function(options) {
                this.options = jQuery.extend({}, this.options, options);
                for (var key in options) {
                    if (/^on[A-Z][A-Za-z]*$/.test(key)) {
                        $(this).bind(key, options[key]);
                    }
                }
            }
            var fn = function() {
                if (subclass._init && typeof subclass._init == "function") {
                    this._init.apply(this, arguments);
                }
            }
            if (typeof subclass == "object") {
                fn.prototype = subclass;
            }
            return fn;
        }
    module.exports = PopupLayer = new Class({
            options: {
                trigger: null, //触发的元素或id,必填参数
                popupBlk: null, //弹出内容层元素或id,必填参数
                closeBtn: null, //关闭弹出层的元素或id
                posX:null,  // 声明拖动元素的X偏移量
                posY:null,  // 声明拖动元素的Y偏移量
                popupLayerClass: "popupLayer", //弹出层容器的class名称
                dragClass: "titlebar", //拖动条的class名称
                eventType: "click", //触发事件的类型
                offsets: { //弹出层容器位置的调整值
                    x: 0,
                    y: 0
                },
                isCentered: false, //是否弹出元素，默认跟随触发元素
                useOverlay: false, //是否使用全局遮罩
                usePopupIframe: true, //是否使用容器遮罩
                isDrag: false, //是否弹出层可拖动
                isresize: true, //是否绑定window对象的resize事件
                delayedToShow: null,  // 变量延迟显示
                delayedTohide: null,  // 变量延迟隐藏
                isSetPosition: true,  // 变量延迟隐藏
                isDoPopup: true,  // 变量 是否做弹出
                isOverlay: true,  // 变量 是否加载遮罩
                onBeforeStart: function() {}, //自定义事件
                onAfterPop : function() {},
                onCloseCallBack : function() {}
            },
            _init: function(options) {
                this.isPop = false; //区分是否已经点击了 按钮而弹出了页面
                this.setOptions(options); //载入设置
                this.popupLayer = $(document.createElement("div")).addClass(this.options.popupLayerClass); //初始化最外层容器
                this.popupIframe = $(document.createElement("iframe")).attr({
                    border: 0,
                    frameborder: 0
                }); //容器遮罩,用于屏蔽ie6下的select
                this.dragBar = $(document.createElement("div")).attr({
                    "title": "按住鼠标可拖动",
                    "class": this.options.dragClass
                }).css({
                    "background-color": "#EAEAEA",
                    "cursor": "move",
                    "height": "40px",
                    "left": 0,
                    "opacity": 0,
                    "position": "absolute",
                    "top": 0,
                    "width": "100%",
                    "z-index": 998
                }); //  添加可拖动层
                this.trigger = $(this.options.trigger); //把触发元素封装成实例的一个属性，方便使用及理解
                this.popupBlk = $(this.options.popupBlk); //把弹出内容层元素封装成实例的一个属性
                this.closeBtn = $(this.options.closeBtn); //把关闭按钮素封装成实例的一个属性
                $(this).trigger("onBeforeStart"); //执行自定义事件。
                //this._construct() //通过弹出内容层，构造弹出层，即为其添加外层容器及底层iframe
                //   mouseenter触发事件
                this.trigger.unbind();
                this.closeBtn.unbind();
                this.options.eventType === "mouseenter" ? this.trigger.bind(this.options.eventType, function(e) {
                        this.delayedToShow = setTimeout(this.popup.binding(this, e),200);
                }.binding(this)) : null;
                //   click触发事件
                this.options.eventType === "click" ? this.trigger.bind(this.options.eventType, function(e) {
                        setTimeout(this.popup.binding(this, e),0);
                }.binding(this)) : null;
                this.isresize ? $(window).bind("resize", this.doresize.binding(this)) : null;
                //this.options.closeBtn ? this.closeBtn.bind("click", this.close.binding(this)) : null;   //  如果有关闭按钮，则给关闭按钮绑定关闭事件
                this.options.isDrag ? this.dragBar.bind("mousedown", this.mouseDown.binding(this)): null; //  如果可拖动，则鼠标按下拖动它
                this.options.isDrag ? $(document).bind("mouseup", this.stopIt.binding(this)): null;       //  如果可拖动，则鼠标抬起取消拖动
                this.options.eventType === "mouseenter" ? this.trigger.bind("mouseleave", this.delayedRemoveIt.binding(this)): null;  // 鼠标从目标元素移走弹出层消失
                this.options.eventType === "mouseenter" ? this.popupBlk.bind("mouseenter", this.remainIt.binding(this)): null;     //  鼠标从弹出元素移入弹出层不消失
                this.options.eventType === "mouseenter" ? this.popupBlk.bind("mouseleave", this.removeIt.binding(this)): null;    //  鼠标从弹出元素移走弹出层消失
            },
            popup : function (e){   //给触发元素的触发弹出事件
                if (this.isPop) {
                    this.close();
                }
                this._construct();
                var left = null;
                var top = null;
                // mouseenter定位
                if (this.options.isSetPosition && (this.options.eventType === "mouseenter")) {
                    var pWidth = this.popupLayer.width();  // 弹出元素宽度
                    var pHeight = this.popupLayer.height(); // 弹出元素高度
                    var tWidth = this.trigger.width(); // 目标元素宽度
                    var tHeight = this.trigger.height(); // 目标元素高度
                    var bWidth = $(window).width();
                    var bHeight = $(window).height();
                    var wHeight = $(window).scrollLeft(); // 滚动条宽度
                    var sHeight = $(window).scrollTop(); // 滚动条高度
                    var x = this.options.offsets.x;
                    var y = this.options.offsets.y;
                    var leftOffset = $(e.currentTarget).offset().left; // 目标元素left
                    var topOffset = $(e.currentTarget).offset().top;  // 目标元素top
                    var offsetToLeft = bWidth - leftOffset + wHeight;
                    var offsetToBottom = bHeight - topOffset + sHeight;
                    // 卡片定位
                    if (bWidth - leftOffset > pWidth) {  //右方显示
                        left = leftOffset + tWidth;
                    } else {
                        left = leftOffset + tWidth - pWidth - tWidth;
                    }
                    if (offsetToBottom > pHeight) {   //下方显示
                        top = topOffset + tHeight;
                    } else {
                        top = topOffset - pHeight;
                    }

                    left = left + x;
                    top = top + y;
                    this.setPosition(left, top);
                }
                // click定位
                if (this.options.isSetPosition && (this.options.eventType === "click")) {
                    //left = this.trigger.offset().left + this.options.offsets.x;
                    //top = this.trigger.offset().top + this.trigger.get(0).offsetHeight + this.options.offsets.y
                    left = $(e.currentTarget).offset().left + this.options.offsets.x;
                    top = $(e.currentTarget).offset().top + $(e.currentTarget).get(0).offsetHeight + this.options.offsets.y
                    this.setPosition(left, top);
                }
                this.options.useOverlay ? this._loadOverlay() : null; //如果使用遮罩则加载遮罩元素
                (this.options.isOverlay && this.options.useOverlay) ? this.overlay.show() : null;
                if (this.options.isDoPopup && (this.popupLayer.css("display") === "none")) {
                    this.options.isCentered ? this.doEffects("open") : this.popupLayer.show();
                }

                this.isPop = true;
                $(this).trigger("onAfterPop",e); //执行自定义事件。
            },
            _construct: function() { //构造弹出层
                this.copyId = "pop_copy_" + Math.ceil(Math.random() * 1000);
                $("<div id='" + this.copyId + "'></div>").insertBefore(this.popupBlk);
                this.popupBlk.show();
                this.popupLayer.append(this.popupBlk.css({
                    "opacity": 1
                })).appendTo($(document.body)).css({
                    "position" : "absolute",
                    'z-index' : 1000,
                    "width" : this.popupBlk.get(0).offsetWidth,
                    "height" : this.popupBlk.get(0).offsetHeight
                });

                this.options.usePopupIframe ? this.popupLayer.append(this.popupIframe) : null;
                this.options.isDrag ? this.popupBlk.append(this.dragBar) : null;
                this.recalculatePopupIframe();
                this.popupLayer.hide();
                this.options.closeBtn ? this.closeBtn.bind("click", this.close.binding(this)) : null;
            },
            _loadOverlay: function() { //加载遮罩
                var isIe6 = !-[1,] && !window.XMLHttpRequest;   // 前者为判断IE浏览器，后为判断版本
                var pageWidth = isIe6 ? $(document).width() - 21 : $(document).width();
                this.overlay ? this.overlay.remove() : null;
                this.overlay = $(document.createElement("div"));
                this.overlay.css({
                    position: "absolute",
                    "z-index" : 999,
                    "left" : 0,
                    "top" : 0,
                    "zoom" : 1,
                    "display" : "none",
                    "width" : pageWidth,
                    "height" : $(document).height()
                }).appendTo($(document.body)).append("<div style='position:absolute;z-index:1000;width:100%;height:100%;left:0;top:0;opacity:0.3;filter:Alpha(opacity=30);background:#000'></div><iframe frameborder='0' border='0' style='width:100%;height:100%;position:absolute;z-index:999;left:0;top:0;filter:Alpha(opacity=0);'></iframe>")
            },
            doresize: function() {
                var isIe6 = !-[1,] && !window.XMLHttpRequest;   // 前者为判断IE浏览器，后为判断版本
                this.overlay ? this.overlay.css({
                    width: isIe6 ? $(document).width() - 21 : $(document).width(),
                    height: isIe6 ? $(document).height() - 4 : $(document).height()
                }) : null;
                if (this.options.isSetPosition) {
                    this.setPosition(this.trigger.offset().left + this.options.offsets.x, this.trigger.offset().top + this.trigger.get(0).offsetHeight + this.options.offsets.y);
                }
            },
            setPosition: function(left, top) { //通过传入的参数值改变弹出层的位置
                this.popupLayer.css({
                    "left" : left,
                    "top" : top
                });
            },
            doEffects: function(way) { //做特效
                way == "open" ? this.popupLayer.css({
                    left: ($(document).width() - this.popupLayer.width())/2,
                    top: $(window).height()-this.popupLayer.height() > 0 ? ($(document).scrollTop()+($(window).height()-this.popupLayer.height())/2) : $(document).scrollTop()
                }).show() : this.popupLayer.hide();
            },
            recalculatePopupIframe: function() { //重绘popupIframe,这个不知怎么改进，只好先用这个笨办法。
                this.popupIframe.css({
                    "position" : "absolute",
                    'z-index' : -1,
                    "left" : 0,
                    "top" : 0,
                    "opacity" : 0,
                    "width" : this.popupBlk.get(0).offsetWidth,
                    "height" : this.popupBlk.get(0).offsetHeight
                });
            },
            close: function() { //关闭方法
                if (this.isPop) {
                    this.options.useOverlay ? this.overlay.remove() : null;
                    this.popupLayer.remove();
                    this.popupBlk.insertBefore($("#" + this.copyId));
                    this.popupBlk.hide();
                    $("#" + this.copyId).remove();
                }

                //this.options.isCentered ? this.doEffects("close") : this.popupLayer.remove();
                $(this).trigger("onCloseCallBack"); //执行关闭以后的回掉
            },
            mouseDown: function(e) { //触发拖动方法
                this.options.posX = e.clientX - parseInt(this.popupLayer[0].style.left);
                this.options.posY = e.clientY - parseInt(this.popupLayer[0].style.top);
                document.onmousemove = this.moveIt.binding(this);
            },
            moveIt : function (e){  //拖动方法
                if (e == null){
                    e = window.event;
                }
                this.popupLayer[0].style.left = (e.clientX - this.options.posX) + "px";
                this.popupLayer[0].style.top = (e.clientY - this.options.posY) + "px";
            },
            stopIt : function (){  //取消拖动
                document.onmousemove = null;
            },
            removeIt : function (){ //  鼠标从弹出元素移走弹出层消失
                this.popupLayer.hide();
            },
            remainIt : function (){      //  鼠标从弹出元素移入弹出层不消失
                clearTimeout(this.delayedTohide);
                this.popupLayer.show();
            },
            delayedRemoveIt : function (){   // 鼠标从目标元素移走弹出层消失
                clearTimeout(this.delayedToShow);
                this.delayedTohide = setTimeout(this.removeIt.binding(this),200);
            }
        });
});
