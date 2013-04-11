/*
*  AngularJs Fullcalendar Wrapper for the JQuery FullCalendar
*  API @ http://arshaw.com/fullcalendar/
*
*  Angular Calendar Directive that takes in the [eventSources] nested array object as the ng-model and watches it deeply changes.
*       Can also take in multiple event urls as a source object(s) and feed the events per view.
*       The calendar will watch any eventSource array and update itself when a change is made.
*
*/

angular.module('ui.calendar', [])
.constant('uiCalendarConfig', {})
.factory('Calendar',function(){
  return function(elem){
    var calendar = elem;//this will become the fullcalendar object when loaded
    var call = function(call,args){//interface to fullcalendars functions
      return calendar.fullCalendar(call,args);
    };
    this.test = 'works';
    this.refetchEvents = function(){//refetchEvents... this way an interface can be made to all functionality and add more controll.
      return call('refetchEvents');
    };
    this.init = function(options){//the creation of the fullcalendar.
      return call(options);
    };
    this.fullCalendar = function(call,args){//backwards compatibility
      return call(call,args);
    };
  };
})
.directive('uiCalendar', ['uiCalendarConfig', 'Calendar' , '$parse', function(uiCalendarConfig,Calendar) {
  uiCalendarConfig = uiCalendarConfig || {};
  //returns calendar
  return {
    require: 'ngModel',
    scope: {ngModel:'=',config:'='},
    restrict: 'A',
    controller:function($scope,$element){
    },
    link: function(scope, elm, attrs,calCtrl) {
      var sources = scope.ngModel;//scope.$eval(attrs.ngModel);
      scope.destroy = function(){
        if(attrs.calendar){
          scope.calendar = scope.$parent[attrs.calendar] =  new Calendar(elm.html(''));
        }else{
          scope.calendar = new Calendar(elm.html(''));
        }
      };
      scope.destroy();
      //scope.calendar = elm.html('');
      var eventsFingerprint = function() {
        var fpn = "";
        angular.forEach(sources, function(events) {
          if (angular.isArray(events)) {
            for (var i = 0, n = events.length; i < n; i++) {
              var e = events[i];
              // This extracts all the information we need from the event. http://jsperf.com/angular-calendar-events-fingerprint/3
              fpn = fpn + (e.id || '') + (e.title || '') + (e.url || '') + (+e.start || '') + (+e.end || '') +
                (e.allDay || false) + (e.className || '');
            }
          } else {
            fpn = fpn + (events.url || '');
          }
        });
        return fpn;
      };
      scope.init = function(){
        var options = { eventSources: sources };
        // not sure which would be more convenient
        //angular.extend(options, uiCalendarConfig, scope.config ? scope.config : {});
        angular.extend(options, uiCalendarConfig, attrs.uiCalendar ? scope.$parent.$eval(attrs.uiCalendar) : {});
        scope.calendar.init(options);
      };
      scope.init();
      // Track changes in array by assigning numeric ids to each element and watching the scope for changes in those ids
      var changeTracker = function(array) {
        var self;
        // Map objects to unique numeric IDs and vice-versa. To avoid memory leaks call forget on discarded objects
        var idMap = {}, nextId = 1;
        var idStore = {
          toId: function(element) {
            return element.__id || (element.__id = nextId++);
          },
          fromId: function(id) {
            return idMap[id];
          },
          remember: function(element) {
            idMap[this.toId(element)] = element;
          },
          forget: function(element) {
            delete idMap[element.__id];
          }
        };

        var elementIds = function() {
          return array.map(function(el) {
            idStore.remember(el);
            return idStore.toId(el);
          });
        };
        var subtractAsSets = function(a, b) {
          var result = [], inB = {}, i, n;
          for (i = 0, n = b.length; i < n; i++) {
            inB[b[i]] = true;
          }
          for (i = 0, n = a.length; i < n; i++) {
            if (!inB[a[i]]) {
              result.push(a[i]);
            }
          }
          return result;
        };
        var applyChanges = function(newIds, oldIds) {
          var i, n, el;
          var addedIds = subtractAsSets(newIds, oldIds);
          for (i = 0, n = addedIds.length; i < n; i++) {
            self.onAdded(idStore.fromId(addedIds[i]));
          }
          var removedIds = subtractAsSets(oldIds, newIds);
          for (i = 0, n = removedIds.length; i < n; i++) {
            el = idStore.fromId(removedIds[i]);
            idStore.forget(el);
            self.onRemoved(el);
          }
        };
        return self = {
          subscribe: function(scope) {
            scope.$watch(elementIds, applyChanges, true);
          }
        };
      };

      var sourcesTracker = changeTracker(sources);
      sourcesTracker.subscribe(scope);
      sourcesTracker.onAdded = function(source) {
        scope.calendar.addEventSource(source);
      };
      sourcesTracker.onRemoved = function(source) {
        scope.calendar.removeEventSource(source);
      };
      scope.$watch(eventsFingerprint, function() {
        scope.calendar.refetchEvents();
      });
    }
  };
}]);
