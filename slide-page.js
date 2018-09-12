(function ($) {
    "use strict";

    var slidePage = function () {
        return this.init.apply(this, arguments);
    };

    /**
     * Простой плагин для вертикального полноэкранного переключения блоков страницы.
     * Плагин не устанавливает размеры блоков, их необходимо самостоятельно задать в стилях
     *
     *
     * Использование:
     *
     *   html:
     *      <div class="blocks">
     *          <div></div>
     *          <div></div>
     *          <div></div>
     *      </div>
     *
     *   js:
     *     $('.blocks').slidePage({
     *          minHeight: 800,
     *     });
     *
     */

    $.extend(slidePage, {
        options: {
            /* Время, спустя которое можно скролить */
            scrollDelay: 200,

            /* Высота экрана, меньше которой нужно выключить слайдер */
            minHeight: 600,

            /* Ширина экрана, меньше которой нужно выключить слайдер */
            minWidth: 1200,

            /* Время переключения слайдов */
            transitionSwitch: 600,

            fixedMode: false,

            /*
                Элементы навигации.
                Можно создать собственные, добавив при необходимости data-go-to-section="Номер слайда на который нужно переключиться"
              */
            dots: false,

            enableTouch: false,

            /* Функция анимации */
            timingFunction: 'ease-out',

            /*
               Функция, которая будет вызвана во время скрола, до всех операций со слайдами.

               Принимаемые параметры: номер текущего слайда (current),
               номер следующего слайда (next), направление скрола (direction), событие (event) .

               Функция обязана возвращать одно из трех строковых значений:
               continue - продолжается работа плагина, происходит переключение слайдов
               break - переключение слайдов не происходит
               scroll - переключение слайдов не происходит, разрешается обычный скролл
             */
            beforeScroll: $.noop,

            /*
              Функция, которая будет вызвана непосредственно перед переключением слайда.

              Принимаемые параметры: текущий слайд ($current),
              следующий слайд ($next), направление скрола (direction) .
            */
            beforeSwitch: $.noop,

            /*
              Функция, которая будет вызвана после переключения слайда.

              Принимаемые параметры: текущий слайд ($current),
              следующий слайд ($next), направление скрола (direction) .
            */
            afterSwitch: $.noop,
        },

        $element: undefined,

        $sections: undefined,

        activeSectionClass: 'sp-active-section',
        leaveSectionClass: 'sp-leave-section',
        overflowClass: 'sp-overflow-hidden',
        initClass: 'sp-initialized',
        wrapperClass: 'sp-conveyor',
        dotsWrapperClass: 'sp-dots-list',
        fixedModeClass: 'sp-fixed-mode',
        moveDownClass: 'sp-move-down',
        moveUpClass: 'sp-move-up',

        /**
         * При добавлении этого класса к слайду, слайд будет пропущен при инициализации плагина
         */
        notIncludeSectionClass: 'sp-not-include',

        /**
         * Этот класс следует добавить к слайду, по высоте меньшему, чем высота экрана, который должен быть прижат к низу экрана
         */
        bottomSectionClass: 'sp-section-bottom',

        dataGoToSection: 'go-to-section',

        maxSectionHeight: 0,

        amountSections: 0,

        totalMoveY: 0,

        totalScroll: 0,

        intervalDelta: undefined,

        delta: 0,

        summaryDeltaScroll: null,

        animationEnd: false,

        countWheel: 0,

        isTouchDevice: false,

        isTouch: false,

        switchOff: false,

        init: function (element, options) {
            if (element === undefined) return;

            var me = this;

            me.options = $.extend(me.options, options);

            if (!me.options.enableTouch) {
                me.isTouchDevice = navigator.userAgent.match(/(iPhone|iPod|iPad|Android|playbook|silk|BlackBerry|BB10|Windows Phone|Tizen|Bada|webOS|IEMobile|Opera Mini)/);
                me.isTouch = (('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0) || (navigator.maxTouchPoints));
            }

            me.switchOff = $(window).width() < me.options.minWidth || $(window).height() < me.options.minHeight;

            if (me.switchOff || me.isTouchDevice || me.isTouch) {
                return this;
            }

            me.$element = $(element);

            if (me.$element.hasClass(me.initClass)) {
                return this;
            }

            me.preparation();

            me.bind();

            return this;
        },

        preparation: function () {
            var me = this;
            var $body = $('body');

            var $wrapper = $('<div/>', {
                class: me.wrapperClass,
                css: {
                    '-webkit-transition': 'all ' + me.options.transitionSwitch + 'ms ' + me.options.timingFunction,
                    '-o-transition': 'all ' + me.options.transitionSwitch + 'ms ' + me.options.timingFunction,
                    'transition': 'all ' + me.options.transitionSwitch + 'ms ' + me.options.timingFunction
                }
            });

            var $dotsList = $('<ul/>', {
                class: me.dotsWrapperClass
            });

            $body.addClass(me.overflowClass);

            me.$element.addClass(me.overflowClass).addClass(me.initClass);

            if (me.options.fixedMode) {
                me.$element.addClass(me.fixedModeClass);
            }

            me.$sections = me.$element.children();

            me.$sections.each(function (index) {
                var $this = $(this);

                if (!$this.hasClass(me.notIncludeSectionClass)) {
                    me.amountSections++;

                    index = index + 1;

                    if (me.options.fixedMode) {
                        $this.css({
                            '-webkit-transition': 'all ' + me.options.transitionSwitch + 'ms ' + me.options.timingFunction,
                            '-o-transition': 'all ' + me.options.transitionSwitch + 'ms ' + me.options.timingFunction,
                            'transition': 'all ' + me.options.transitionSwitch + 'ms ' + me.options.timingFunction
                        });
                    }

                    if (index === 1) {
                        $this.addClass(me.activeSectionClass);
                    }

                    if ($this.height() > me.maxSectionHeight) {
                        me.maxSectionHeight = $this.height();
                    }

                    $dotsList.append('<li><a href="#" data-' + me.dataGoToSection + '="' + index + '">.</a></li>');

                    $this.attr('data-section', index);
                }
            }).wrapAll($wrapper);

            if (me.options.dots){
                $body.append($dotsList);
            }
        },

        bind: function () {
            var me = this;

            $(window).on('mousewheel MozMousePixelScroll DOMMouseScroll touchmove', function (e) {
                if (me.switchOff) {
                    return true;
                }

                var current = me.getCurrentIndex();
                var direction = me.detectDirection(e);
                var next;
                var switched = false;

                if (direction === 'up') {
                    next = current - 1;
                } else {
                    next = current + 1;
                }

                var beforeScroll = me.options.beforeScroll.call(me, current, next, direction, e);

                switch (beforeScroll) {
                    case 'continue':
                        break;

                    case 'break':
                        return false;

                    case 'scroll':
                        return true;

                    default:
                        break;
                }

                if (me.intervalDelta === undefined) {
                    me.switchSection(current, next, direction);
                }

                clearTimeout(me.intervalDelta);

                me.intervalDelta = setTimeout(function () {
                    me.intervalDelta = undefined;
                }, me.options.scrollDelay);

                return false;
            });

            $(window).on('resize', function () {
                me.switchOff = $(this).width() < me.options.minWidth || $(this).height() < me.options.minHeight;

                if (me.options.fixedMode) {

                    if (me.switchOff) {
                        me.$element.removeClass(me.fixedModeClass).removeClass(me.overflowClass);
                        $('body').removeClass(me.overflowClass);

                    } else {
                        me.$element.addClass(me.fixedModeClass).addClass(me.overflowClass);
                        $('body').addClass(me.overflowClass);
                    }

                } else {
                    var current = me.getCurrentIndex();
                    var move = 0;
                    var height = 0;

                    me.$sections.each(function (index) {
                        var $this = $(this);

                        if ($this.data('section') < current) {

                            if ((index + 1) === (current - 1) && $this.next().hasClass(me.bottomSectionClass)) {
                                height = $this.next().height();
                            } else {
                                height = $this.height();
                            }

                            move -= height;
                        }
                    });

                    me.totalMoveY = move;

                    if (me.switchOff) {
                        $('body').removeClass(me.overflowClass);
                        me.$element.removeClass(me.overflowClass);
                        $('.' + me.wrapperClass).css(me.getTranslate3d(0, 0, 0));
                    } else {
                        $('body, html')[0].scrollTop = 0;
                        $('body').addClass(me.overflowClass);
                        me.$element.addClass(me.overflowClass);
                        $('.' + me.wrapperClass).css(me.getTranslate3d(0, me.totalMoveY + 'px', 0));
                    }
                }
            });

            $('[data-' + me.dataGoToSection + ']').on('click', function () {
                me.goToSection($(this).data(me.dataGoToSection));

                return false;
            })

        },

        switchSection: function (current, next, direction) {
            var $current = $('[data-section=' + current + ']');
            var $next = $('[data-section=' + next + ']');
            var me = this;
            var beforeSwitch = this.options.beforeSwitch.call(this, $current, $next, direction);

            if (beforeSwitch === 'break') {
                return false;
            }

            if (this.setTotalMoveY(current, next, direction)) {

                me.summaryDeltaScroll = 0;

                $('[data-section]').removeClass(this.leaveSectionClass);
                $current.removeClass(this.activeSectionClass).addClass(this.leaveSectionClass);
                $next.addClass(this.activeSectionClass);

                if (this.options.fixedMode) {
                    if (direction === 'down') {
                        $next.removeClass(this.moveDownClass).addClass(this.moveUpClass);
                    } else {
                        $current.removeClass(this.moveUpClass).addClass(this.moveDownClass);
                    }
                }

                $('.' + this.wrapperClass).css(this.getTranslate3d(0, this.totalMoveY + 'px', 0));

                this.options.afterSwitch.call(this, $current, $next, direction);
            }
        },

        setTotalMoveY: function (current, next, direction) {
            var start = current;
            var $current;
            var height = 0;

            if (direction === 'down') {

                if (next > this.amountSections || current === this.amountSections) {
                    return false;
                }
                if (this.options.fixedMode) {
                    return true;
                }


                for (start; start < next; start++) {
                    $current = $('[data-section=' + start + ']');


                    if ($current.next().hasClass(this.bottomSectionClass)) {
                        height = $current.next().height();
                    } else if ($current.hasClass(this.bottomSectionClass)) {
                        height = this.maxSectionHeight;
                    } else {
                        height = $current.height();
                    }

                    this.totalMoveY -= height;
                }

            } else {
                if (next < 1 || current === 1) {
                    return false;
                }
                if (this.options.fixedMode) {
                    return true;
                }

                start = current - 1;

                for (start; start >= next; start--) {
                    var $next = $current = $('[data-section=' + start + ']');


                    if ($next.hasClass(this.bottomSectionClass)) {
                        height = this.maxSectionHeight;
                    } else if ($next.next().hasClass(this.bottomSectionClass)) {
                        height = $next.next().height() - (this.maxSectionHeight - $current.height());
                    } else {
                        height = $next.height();
                    }


                    this.totalMoveY += height;
                }

                if (this.totalMoveY > 0) {
                    this.totalMoveY = 0;
                }
            }

            return true;
        },

        goToSection: function (next) {
            var current = this.getCurrentIndex();
            next = parseInt(next, 10);
            var direction = current > next ? 'up' : 'down';

            this.switchSection(current, next, direction);
        },

        getTranslate3d: function (x, y, z) {
            x = x || 0;
            y = y || 0;
            z = z || 0;

            return {
                '-webkit-transform': 'translate3d(' + x + ', ' + y + ', ' + z + ')',
                '-moz-transform': 'translate3d(' + x + ', ' + y + ', ' + z + ')',
                '-ms-transform': 'translate3d( ' + x + ', ' + y + ', ' + z + ')',
                '-o-transform': 'translate3d( ' + x + ', ' + y + ', ' + z + ')',
                'transform': 'translate3d( ' + x + ', ' + y + ', ' + z + ')'
            }
        },

        getCurrentIndex: function () {
            var index = $('.' + this.activeSectionClass).data('section');
            return parseInt(index, 10);
        },

        parseIntFloor: function (number) {
            return Math.floor(parseInt(number), 10);
        },

        detectDirection: function (e, scroll) {
            var touches = e.originalEvent.touches;
            var direct = 'up';
            var currentY;
            var scrollTop = scroll || false;

            if (touches) {
                currentY = touches[0].clientY;

                if (currentY > this.lastScrollTop) {
                    direct = 'down';
                } else {
                    direct = 'up';
                }

                this.lastScrollTop = currentY;

                return direct;
            }

            if (scrollTop) {
                currentY = scrollTop;

                if (currentY >= this.lastScrollTop) {
                    direct = 'down';
                } else {
                    direct = 'up';
                }

                this.lastScrollTop = currentY;

                return direct;
            }

            this.delta = this.parseIntFloor(e.originalEvent.wheelDelta || -e.originalEvent.detail);

            if (this.delta || this.delta === 0) {
                return this.delta >= 0 ? 'up' : 'down'
            }
        },

        map: function (value, in_min, in_max, out_min, out_max) {
            return (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
        }
    });

    return $.fn.slidePage = function (options) {
        return slidePage.init(this, options);
    };
})(jQuery);