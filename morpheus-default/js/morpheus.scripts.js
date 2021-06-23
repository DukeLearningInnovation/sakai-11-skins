(function ($) {

  $(function () {

    // When the checkboxes change update the cell.
    $('.permissions-table input:checkbox').change(function () {
      $(this).parents('td').toggleClass('active', this.checked);
    }).change();
    $(".permissions-table tr:even").addClass("evenrow");
    // Save the default selected
    $('.permissions-table :checked').parents('td').addClass('defaultSelected');

    $('.permissions-table .permissionDescription').hover(function (e) {
      $(this).parents('tr').children('td').toggleClass('rowHover', e.type === "mouseenter");
    });

    $('.permissions-table th').hover(function (event) {

      var col = ($(this).prevAll().size());
      $('.' + col).add(this).toggleClass('rowHover', event.type === "mouseenter");
    });

    $('.permissions-table th#permission').hover(function (event) {
      $('.permissions-table td.checkboxCell').toggleClass('rowHover', event.type === "mouseenter");
    });

    $('.permissions-table th#permission a').click(function (e) {

      $('.permissions-table .checkGrid input').prop('checked', ($('.checkGrid :checked').length === 0)).change();
      e.preventDefault();
    });
    $('.permissions-table .permissionDescription a').click(function (e) {

        var anyChecked = $(this).parents('tr').find('input:checked').not('[disabled]').length > 0;
        $(this).parents('tr').find('input:checkbox').not('[disabled]').prop('checked', !anyChecked).change();
        e.preventDefault();
    });
    $('.permissions-table th.role a').click(function (e) {

        var col = ($(this).parent('th').prevAll().size());
        var anyChecked = $('.permissions-table .' + col + ' input:checked').not('[disabled]').length > 0;
        $('.permissions-table .' + col + ' input').not('[disabled]').prop('checked', !anyChecked).change();
        e.preventDefault();
    });

    $('#clearall').click(function (e) {

        $(".permissions-table input").not('[disabled]').prop("checked", false).change();
        e.preventDefault();
    });
  });
}) ($PBJQ);
(function ($) {

  //Fail if dependencies aren't available
  if ((typeof qtip !== 'object' && typeof moment !== 'object' && typeof portal !== 'object') || typeof moment === 'undefined') {
    return;
  }

  moment.locale(portal.locale);

  portal.bullhorn = $('#Mrphs-bullhorn');

  var formatDate = function (instant) {

    var m = moment.unix(instant.epochSecond);
    return m.format('L LT');
  };

  portal.wrapNoAlertsString = function (noAlertsString) {
    return '<div id="portal-bullhorn-no-alerts">' + noAlertsString + '</div>';
  };

  portal.clearBullhornAlert = function (id, noAlerts) {

    $.get('/direct/portal/clearBullhornAlert', { id: id })
      .done(function () {

        var alertDiv = $('#portal-bullhorn-alert-' + id);

        // Get the ancestor bunch and, if this is the last child, remove it.
        var bunch = alertDiv.closest(".portal-bullhorn-bunch");
        var removeBunch = bunch.find(".portal-bullhorn-alert").length === 1;
        var empty = $('.portal-bullhorn-alert').length === 1;
        alertDiv.remove();
        if (empty) {
            $('#portal-bullhorn-alerts').html(portal.wrapNoAlertsString(noAlerts));
        }

        if (removeBunch) {
          bunch.remove();
        }

        var count = $('.portal-bullhorn-alert').length;
        portal.setBullhornCounter(count);
      });
  };

  portal.clearAllBullhornAlerts = function (noAlerts) {

    $.ajax({url: '/direct/portal/clearAllBullhornAlerts', cache: false})
      .done(function () {

        $('#portal-bullhorn-alerts').html(portal.wrapNoAlertsString(noAlerts));
        portal.setBullhornCounter(0);
      });
  };

  portal.acceptFriendRequest = function (requestorId, friendId, alertId, noAlertsMessage) {

    confirmFriendRequest(friendId,requestorId);
    this.clearBullhornAlert(alertId, noAlertsMessage);
  };

  portal.ignoreFriendRequest = function (ignorerId, friendId, alertId, noAlertsMessage) {

    ignoreFriendRequest(friendId, ignorerId);
    this.clearBullhornAlert(alertId, noAlertsMessage);
  };

  var createBunches = function (allAlerts, prefix) {

    const alerts = allAlerts.filter(a => a.event.startsWith(prefix));

    var map = new Map();

    if (alerts.length > 0) {
      let startDate = alerts[0].eventDate.epochSecond;
      map.set(startDate, []);
      alerts.forEach(aa => {
        let thisDate = aa.eventDate.epochSecond;
        // Bunch alerts in 10 minute intervals
        if (thisDate < (startDate + 10*60)) {
          map.get(startDate).push(aa);
        } else {
          startDate = thisDate;
          map.set(startDate, [aa]);
        }
      });
    }

    // Reverse sort the alerts by date
    map.forEach(list => list.sort((a,b) => { return b.eventDate.epochSecond - a.eventDate.epochSecond; }));

    return map;
  };

  var getBunchedHeader = function (tool, startDate, faClass, i18n) {

    const formattedStartDate = formatDate({epochSecond: startDate});

    var toolName =  i18n.announcementsTool;   
    if ("assignments" === tool) {
      toolName =  i18n.assignmentsTool;
    } else if ("commons" === tool) {
      toolName =  i18n.commonsTool;
    } else if ("lessonbuilder" === tool) {
      toolName =  i18n.lessonsTool;
    } else if ("profile" === tool) {
      toolName = i18n.socialAlerts;
    }

    return `
      <div class="card portal-bullhorn-bunch">
        <div class="card-header" id="${tool}-${startDate}-header">
            <button class="btn btn-link" type="button" data-toggle="collapse" data-target="#${tool}-${startDate}-panel"
                            aria-expanded="true" aria-controls="${tool}-${startDate}-panel">
              <div class="portal-bullhorn-icon fa fa-stack"><i class="fa fa-circle fa-stack-2x"></i><i class="fa ${faClass} fa-stack-1x fa-inverse"></i></div>
              <div class="portal-bullhorn-bunch-title">${toolName} ${i18n.alertsFrom} ${formattedStartDate}</div>
            </button>
        </div>
        <div id="${tool}-${startDate}-panel" class="collapse" aria-labelledby="${tool}-${startDate}-header" data-parent="#academic-alerts">
          <div class="card-body">
      `;
  };

  var getAlertMarkup = function(alert, message, faClass, i18n, social) {

    const formattedDate = formatDate(alert.eventDate);

    var header = `<div id="portal-bullhorn-alert-${alert.id}" class="portal-bullhorn-alert">`;

    var footer = `
          <div class="portal-bullhorn-time">${formattedDate}</div>
        </div>
        <div class="portal-bullhorn-clear">
          <a href="javascript:;" onclick="portal.clearBullhornAlert('${alert.id}','${i18n.noAlerts}');" title="${i18n.clear}">
            <i class="fa fa-times" aria-hidden="true"></i>
          </a>
        </div>
      </div>`;

    if (social) {
      return `
        ${header}
          <div class="portal-bullhorn-photo" style="background-image:url(/direct/profile/${alert.fromUser}/image/thumb)"></div>
          <div class="portal-bullhorn-message">
            <div>
              <a href="${alert.url}" class="portal-bullhorn-connectionmanager-pending">${message}</a>
            </div>
        ${footer}
      `;
    } else {
      return `
        ${header}
          <div class="portal-bullhorn-icon fa fa-stack"><i class="fa fa-circle fa-stack-2x"></i><i class="fa ${faClass} fa-stack-1x fa-inverse"></i></div>
          <div class="portal-bullhorn-message">
            <div>
              <a href="${alert.url}" style="text-decoration: none;">
                <span class="portal-bullhorn-display-name">${alert.fromDisplayName}</span>
                ${message}
              </a>
            </div>
          ${footer}
        `;
    }
  };

  var getBunchMarkup = function (bunch, i18n) {

    var faClass = "fa-bullhorn";
    var messageTemplate = i18n.announcement;
    var social = false;
    if ("assignments" === bunch.type) {
      faClass = 'fa-file-text';
    } else if ("commons" === bunch.type) {
      faClass = 'fa-bank';
      messageTemplate = i18n.academicCommentCreated;
    } else if ("lessonbuilder" === bunch.type) {
      faClass = 'fa-file-text-o';
      messageTemplate = i18n.academicLessonBuilderCommentCreate;
    } else if ("profile" === bunch.type) {
      faClass = "icon-sakai--sakai-profile2";
      social = true;
    }

    var formattedStartDate = formatDate({epochSecond: bunch.latest});

    markup = getBunchedHeader(bunch.type, bunch.latest, faClass, i18n);

    bunch.alerts.forEach(alert => {

      if ("asn.new.assignment" === alert.event || "asn.revise.access" === alert.event) {
        messageTemplate = i18n.assignmentCreated;
      } else if ("asn.grade.submission" === alert.event) {
        messageTemplate = i18n.assignmentSubmissionGraded;
      } else if ("profile.friend.request" === alert.event) {
        messageTemplate = i18n.friendRequest;
      } else if ("profile.friend.confirm" === alert.event) {
        messageTemplate = i18n.friendConfirm;
      } else if ("profile.message.sent" === alert.event) {
        messageTemplate = i18n.message;
      } else if ("profile.status.update" === alert.event) {
        messageTemplate = i18n.statusUpdate;
      } else if ("profile.wall.item.new" === alert.event) {
        messageTemplate = i18n.wallPost;
      } else if ("profile.wall.item.comment.new" === alert.event) {
        messageTemplate = i18n.postComment;
      }

      if (social) {
        var message = messageTemplate.replace('{0}', alert.fromDisplayName);
      } else {
        var message = messageTemplate.replace('{0}', alert.title).replace('{1}', alert.siteTitle);
      }

      markup += getAlertMarkup(alert, message, faClass, i18n, social);
    });

    markup += "</div></div></div>";

    return markup;
  };

  $(function () {

    portal.bullhorn.qtip({
      suppress: false,
      position: { adjust: { scroll: false }, my: 'top right', at: 'bottom left', target: portal.socialBullhorn },
      show: { event: 'click', delay: 0, solo: portal.socialBullhorn },
      style: { classes: 'portal-bullhorns' },
      hide: { event: 'click unfocus' },
      content: {
        text: function (event, api) {

          return $.ajax({
            url: '/direct/portal/bullhornAlerts.json',
            dataType: 'json',
            cache: false,
          }).then(function (data) {

            if (data.message && data.message === 'NO_ALERTS') {
              return portal.wrapNoAlertsString(data.i18n.noAlerts);
            } else {
              var markup = '<div id="portal-bullhorn-alerts" class="accordion">';

              var allBunches = [];
              createBunches(data.alerts, "annc").forEach(alerts => allBunches.push({ type: "announcements", alerts: alerts }));
              createBunches(data.alerts, "asn").forEach(alerts => allBunches.push({ type: "assignments", alerts: alerts }));
              createBunches(data.alerts, "commons").forEach(alerts => allBunches.push({ type: "commons", alerts: alerts }));
              createBunches(data.alerts, "lessonbuilder").forEach(alerts => allBunches.push({ type: "lessonbuilder", alerts: alerts }));
              createBunches(data.alerts, "profile").forEach(alerts => allBunches.push({ type: "profile", alerts: alerts }));

              allBunches.forEach(b => {
                b.latest = b.alerts.reduce((acc, a) => { return (a.eventDate.epochSecond > acc) ? a.eventDate.epochSecond : acc; }, 0);
              });

              allBunches.sort((a,b) => { return b.latest - a.latest; });

              allBunches.forEach(b => { markup += getBunchMarkup(b, data.i18n) });

              markup += `
                  <div id="portal-bullhorn-clear-all">
                    <a href="javascript:;" onclick="portal.clearAllBullhornAlerts('${data.i18n.noAlerts}');">${data.i18n.clearAll}</a>
                  </div>
                </div>
              `;

              return markup;
            }
          }, function (xhr, status, error) { api.set('content.text', status + ': ' + error); });
        }
      },
      events: {
        visible: function (event, api) {

          var firstBunch = document.querySelector("#bullhorn-alerts button");
          if (firstBunch) {
            firstBunch.focus();
          }
        }
      }
    });
  });

  portal.setBullhornCounter = function (count) {

    var horn = $('#Mrphs-bullhorn');
    var colour = 'red';
    horn.find('#bullhorn-counter').remove();
    horn.append('<span id="bullhorn-counter" class="bullhorn-counter-red">' + count + '</span>');
  };

  var updateCounts = function () {

    $.ajax({
      url: '/direct/portal/bullhornAlertCount.json',
      cache: false,
      data: {
        auto: true // indicates that this request is not a user action
      }
    }).done(function (data) {
      if (data > 0) {
        portal.setBullhornCounter(data);
      } else {
        portal.bullhorn.find('#bullhorn-counter').remove();
      }
    }).fail(function (xhr, status, error) {
      if (console) console.log('Failed to get the bullhorn counts. Status: ' + status);
      if (console) console.log('FAILED ERROR: ' + error);
      clearInterval(portal.bullhornCountIntervalId);
    });
  };

  if (portal.loggedIn && portal.bullhorns && portal.bullhorns.enabled) {
    updateCounts();
    portal.bullhornCountIntervalId = setInterval(updateCounts, portal.bullhorns.pollInterval);
  }
}) ($PBJQ);
/**
 * For inline Chat in Morpheus: 
 */
 $PBJQ('#footerAppPresence').on("click", function() {
 	$PBJQ('#presenceArea').toggleClass('is-hidden');
 });(function ($) {

  if (!portal.loggedIn) {
    return;
  }

  portal.connectionManager = portal.connectionManager || {};

  var connectionTemplate = Handlebars.templates['connection-manager-connection'];
  var searchResultTemplate = Handlebars.templates['connection-manager-searchresult'];

  var indexedCurrentConnections = {};
  var indexedPendingConnections = {};

  var countPending = function () { return Object.keys(indexedPendingConnections).length; };
  var indexedSearchResults = {};
  var lastSearchResults = {};

  $(function () {

    portal.i18n.loadProperties({
      resourceClass: 'org.sakaiproject.portal.api.PortalService',
      resourceBundle: 'connection-manager',
      namespace: 'connection-manager',
      callback: function () {

        portal.i18n.loadProperties({
          resourceClass: 'org.sakaiproject.portal.api.PortalService',
          resourceBundle: 'profile-popup',
          namespace: 'connection-manager'
        });
      }
    });
  });

  var currentTotal = 0;
  var currentConnections = [];

  var CONNECTIONS = 'connections';
  var SEARCH_RESULTS = 'searchresults';

  var currentState = CONNECTIONS;

  var shown = 0;
  var pendingTabBaseHtml = '';

  portal.connectionManager.show = function (options) {

    var connectionManager = $('#connection-manager');

    connectionManager.modal({
      width: 320
    });

    var connectionsView = $('#connection-manager-connectionsview');
    var searchResultsView = $('#connection-manager-searchresultsview');
    var searchResultsCount = $('#connection-manager-searchresultsview-count');

    var currentTab = $('#connection-manager-navbar-current > span > a');
    var pendingTab = $('#connection-manager-navbar-pending > span > a');

    var updateSearchResultsCount = function (count) {

      if (count === 0) {
        searchResultsCount.html(portal.i18n.tr('connection-manager', 'connection_manager_no_results'));
      } else {
        var translateOptions
          = {count: count, criteria: portal.connectionManager.searchCriteria};
        var countMessage = (count > 1)
          ? portal.i18n.tr('connection-manager', 'connection_manager_results_count', translateOptions)
          : portal.i18n.tr('connection-manager', 'connection_manager_result_count', translateOptions);

        searchResultsCount.html(countMessage);
      }
    };

    var showCurrentTab = function () {

      pendingConnectionsWrapper.hide();
      currentConnectionsWrapper.show();
      connectionsView.show();
      searchResultsView.hide();
      currentTab.parent().addClass('current');
      pendingTab.parent().removeClass('current');
    };

    var showPendingTab = function () {

      currentConnectionsWrapper.hide();
      pendingConnectionsWrapper.show();
      connectionsView.show();
      searchResultsView.hide();
      pendingTab.parent().addClass('current');
      currentTab.parent().removeClass('current');
    };

    var addPendingAndShowTab = function (friendId, displayName) {

      var countBefore = countPending();

      $('#connection-manager-connection-' + friendId).remove();

      if (searchResults.children().length === 1) {
        searchResultsWrapper.hide();
      }

      var connection = indexedSearchResults[friendId];
      connection.connected = false;
      connection.hideConnect = true;
      connection.outgoing = true;

      indexedPendingConnections[friendId] = connection;

      var markup = connectionTemplate(connection);
      if (countBefore === 0) {
        pendingConnectionsDiv.show().html('');
        noPendingConnectionsDiv.hide();
      }
      pendingConnectionsDiv.append(markup);
      updatePendingTabText();

      if (currentState === CONNECTIONS
            || (currentState == SEARCH_RESULTS && moreSearchResults.children().length === 0)) {
        showPendingTab();
      }

      $('#connection-manager-cancel-button-' + friendId).click(cancelHandler);
    };

    currentTab.click(function (e) { showCurrentTab(); });
    pendingTab.click(function (e) { showPendingTab(); });

    var searchResultsWrapper = $('#connection-manager-connectionsview-searchresults-wrapper');
    var searchResults = $('#connection-manager-connectionsview-searchresults');
    var moreSearchResults = $('#connection-manager-searchresultsview-results');

    connectionManager.click(function (e) {

      if (e.target.id !== 'connection-manager-connectionsview-searchbox') {
        var wrapperRect = searchResultsWrapper[0].getBoundingClientRect();
        var searchBoxRect = searchBox[0].getBoundingClientRect();
        if (e.pageX < wrapperRect.left || e.pageY < wrapperRect.top
              || e.pageX > (wrapperRect.left + wrapperRect.width)
              || e.pageY > (wrapperRect.top + wrapperRect.height)) {
          searchResultsWrapper.hide();
        }
      }
    });

    var currentConnectionsDiv = $('#connection-manager-current-connections');
    var currentConnectionsWrapper = $('#connection-manager-current-connections-wrapper');
    var noCurrentConnectionsDiv = $('#connection-manager-no-current-connections-wrapper');
    var pendingConnectionsDiv = $('#connection-manager-pending-connections');
    var pendingConnectionsWrapper = $('#connection-manager-pending-connections-wrapper');
    var noPendingConnectionsDiv = $('#connection-manager-no-pending-connections-wrapper');
    var searchBox = $('#connection-manager-connectionsview-searchbox');
    searchBox.clearSearch({callback: function () { searchResultsWrapper.hide(); }});
    var moreSearchBox = $('#connection-manager-searchresultsview-searchbox');

    if (shown == 0) {
      pendingTabBaseHtml = pendingTab.html();
      shown += 1;
    }

    var moveFromPendingToCurrent = function (friendId) {

      $('#connection-manager-connection-' + friendId).remove();
      if (currentTotal == 0) {
          currentConnectionsDiv.html('');
      }
      var connection = indexedPendingConnections[friendId];
      connection.outgoing = false;
      connection.incoming = false;
      connection.connected = true;
      var markup = connectionTemplate(connection);
      currentConnectionsDiv.append(markup);
      currentTotal += 1;
      $('#connection-manager-remove-button-' + friendId).click(removeHandler);
      noCurrentConnectionsDiv.hide();
      delete indexedPendingConnections[friendId];
      if (searchResults.children().length === 1) {
        searchResultsWrapper.hide();
      }
      indexedCurrentConnections[friendId] = connection;
      updatePendingTabText();
      showCurrentTab();
    };

    var acceptHandler = function () {

      var friendId = this.dataset.userId;
      var displayName = this.dataset.displayName;
      $.ajax('/direct/profile/' + portal.user.id + '/confirmFriendRequest?friendId=' + friendId
              , {cache: false})
        .done(function (data) {
          moveFromPendingToCurrent(friendId);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
          console.log('ERROR: failed to confirm request from \'' + displayName + '\'. errorThrown: ' + errorThrown);
        });
    };

    var removePending = function (friendId) {

      $('.connection-manager-connection-' + friendId).remove();
      delete indexedPendingConnections[friendId];
      if (searchResults.children().length === 1) {
        searchResultsWrapper.hide();
      }
      updatePendingTabText();
    };

    var ignoreHandler = function () {

      var friendId = this.dataset.userId;
      var displayName = this.dataset.displayName;
      $.ajax('/direct/profile/' + portal.user.id + '/ignoreFriendRequest?friendId=' + friendId, {cache: false})
        .done(function (data) {
          removePending(friendId);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
          console.log('ERROR: failed to ignore request from \'' + displayName + '\'. errorThrown: ' + errorThrown);
        });
    };

    var connectHandler = function () {

      var friendId = this.dataset.userId;
      var displayName = this.dataset.displayName;
      $.ajax('/direct/profile/' + portal.user.id + '/requestFriend?friendId=' + friendId
              , {cache: false})
        .done(function (data) {

          addPendingAndShowTab(friendId, displayName);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
          console.log('ERROR: failed to request connection to \'' + displayName + '\'. errorThrown: ' + errorThrown);
        });
    };

    var removeCurrent = function (friendId) {

      $('#connection-manager-connection-' + friendId).remove();
      currentTotal -= 1;
      if (currentTotal == 0) {
        noCurrentConnectionsDiv.show();
      }
      delete indexedCurrentConnections[friendId];
    };

    var removeHandler = function () {

      var friendId = this.dataset.userId;
      var displayName = this.dataset.displayName;
      if (confirm(portal.i18n.tr('connection-manager', 'connection_manager_remove_confirm', {displayName: displayName}))) {
        $.ajax('/direct/profile/' + portal.user.id + '/removeFriend?friendId=' + friendId, {cache: false})
          .done(function (data) {
            removeCurrent(friendId);
          })
          .fail(function (jqXHR, textStatus, errorThrown) {
            console.log('ERROR: failed to remove \'' + displayName + '\'. errorThrown: ' + errorThrown);
          });
      }
    };

    var cancelHandler = function () {

      var friendId = this.dataset.userId;
      var displayName = this.dataset.displayName;

      $.ajax('/direct/profile/' + friendId + '/ignoreFriendRequest?friendId=' + portal.user.id, {cache: false})
        .done(function (data) {

          $('.connection-manager-connection-' + friendId).remove();
          delete indexedPendingConnections[friendId];
          updatePendingTabText();
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
          console.log('ERROR: failed to ignore request from \'' + displayName + '\'. errorThrown: ' + errorThrown);
        });
    };

    var updatePendingTabText = function () {

      var pendingTotal = countPending();
      if (pendingTotal === 0) {
        pendingTab.html(pendingTabBaseHtml);
        pendingConnectionsDiv.html('').hide();
        noPendingConnectionsDiv.show();
      } else {
        pendingTab.html(pendingTabBaseHtml + ' (' + pendingTotal + ')');
      }
    };

    var search = function (criteria, showFullConnections) {

      $("#connection-manager-profile-popup-container .qtip").remove();

      var container = (showFullConnections) ? moreSearchResults : searchResults;

      if (criteria.length < 4) {
        container.html('');
        if (!showFullConnections) {
          searchResultsWrapper.hide();
        } else {
          updateSearchResultsCount(0);
        }
        return;
      }

      portal.connectionManager.searchCriteria = criteria;

      var template = (showFullConnections) ? connectionTemplate : searchResultTemplate;

      $.ajax('/direct/portal/connectionsearch.json?query=' + criteria, {cache: false})
        .done(function (results) {

          container.html('');

          if (results.length === 0) {
            if (!showFullConnections) {
              searchResultsWrapper.hide();
            }
            return;
          }

          if (!showFullConnections) {
            searchResultsWrapper.show();
          }

          var markup = '';
          lastSearchResults = results;

          indexedSearchResults = {};
          lastSearchResults.forEach(function (r) {
            indexedSearchResults[r.uuid] = r;
          });

          if (showFullConnections) {
            lastSearchResults.forEach(function (result, i) {
              markup += template(result);
            });
          } else {
            lastSearchResults.slice(0, 5).forEach(function (result, i) {
              markup += template(result);
            });
          }

          if (showFullConnections) {
            updateSearchResultsCount(lastSearchResults.length);
          }

          container.html(markup);

          if (container.children().length > 0) {
            container.show();
          }

          $(function () {

            if (!showFullConnections) {
              profile.attachPopups($('.profile-popup-trigger'), {hide: true, container: "connection-manager-profile-popup-container", callbacks: {connect: addPendingAndShowTab, cancel: removePending, accept: moveFromPendingToCurrent, ignore: removePending, remove: removeCurrent}});
            } else {
              $('.connection-manager-connect-button').click(connectHandler);
            }

            $('#connection-manager-connectionsview-searchresults-more').click(function (e) {

              currentState = SEARCH_RESULTS;

              searchResults.html('');
              searchResultsWrapper.hide();
              connectionsView.hide();
              searchResultsView.show();
              moreSearchBox.val(portal.connectionManager.searchCriteria);
              searchBox.val('');
              $(function () {

                updateSearchResultsCount(lastSearchResults.length);

                var markup = '';
                lastSearchResults.forEach(function (result, i) {

                  result.facebookSet = result.socialNetworkingInfo.facebookUrl;
                  result.twitterSet = result.socialNetworkingInfo.twitterUrl;
                  result.moreResult = true;
                  if (indexedCurrentConnections.hasOwnProperty(result.uuid)) {
                    result.connected = true;
                    result.hideConnect = true;
                  }
                  if (indexedPendingConnections.hasOwnProperty(result.uuid)) {
                    result.connected = false;
                    result.hideConnect = true;
                    result.outgoing = indexedPendingConnections[result.uuid].outgoing;
                    result.incoming = indexedPendingConnections[result.uuid].incoming;
                  }
                  markup += connectionTemplate(result);
                });
                moreSearchResults.html(markup);
                $(function () {

                  $('.connection-manager-accept-button').click(acceptHandler);
                  $('.connection-manager-ignore-button').click(ignoreHandler);
                  $('.connection-manager-connect-button').click(connectHandler);
                  $('.connection-manager-remove-button').click(removeHandler);
                  $('.connection-manager-cancel-button').click(cancelHandler);
                });
              });
            });

            $('#connection-manager-backtoconnections-link').click(function (e) {

              currentState = CONNECTIONS;
              searchResultsView.hide();
              connectionsView.show();
              searchResultsWrapper.hide();
              searchResults.html('');
              searchBox.val('');
            });
          }); // document.ready
        }); // ajax call
    }; // search

    // Load up the current connections
    $.ajax('/direct/profile/' + portal.user.id + '/connections.json', {cache: false})
      .done(function (data) {

        indexedCurrentConnections = {};

        currentTotal = data.length;

        // Reset the search filter
        searchUserIdFilter = [portal.user.id];

        currentConnectionsDiv.html('');

        currentConnections = data;
        if (currentConnections.length == 0) {
          noCurrentConnectionsDiv.show();
        } else {
          noCurrentConnectionsDiv.hide();
        }

        data.forEach(function (connection) {

          connection.facebookSet = connection.socialNetworkingInfo.facebookUrl;
          connection.twitterSet = connection.socialNetworkingInfo.twitterUrl;
          connection.current = true;
          connection.connected = true;
          connection.incoming = false;
          connection.hideConnect = true;
          indexedCurrentConnections[connection.uuid] = connection;
          currentConnectionsDiv.append(connectionTemplate(connection));
        });

        $(function () {
          $('.connection-manager-remove-button').click(removeHandler);
        });
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
          console.log('ERROR: failed to get current connections. errorThrown: ' + errorThrown);
      });

    var pendingConnectionsCallback = function (connections) {

      if (connections.length == 0) {
        noPendingConnectionsDiv.show();
        pendingConnectionsDiv.hide();
      } else {
        noPendingConnectionsDiv.hide();
        pendingConnectionsDiv.show().html('');
      }

      connections.forEach(function (connection) {

        connection.hideConnect = true;
        connection.pending = true;
        pendingConnectionsDiv.append(connectionTemplate(connection));
        indexedPendingConnections[connection.uuid] = connection;
      });

      if (connections.length > 0) {
        // Update the pending tab
        pendingTab.html(pendingTabBaseHtml + ' (' + connections.length + ')');
      } else {
        pendingTab.html(pendingTabBaseHtml);
      }

      $(function () {

        $('.connection-manager-accept-button').click(acceptHandler);
        $('.connection-manager-ignore-button').click(ignoreHandler);
        $('.connection-manager-cancel-button').click(cancelHandler);
      }); // document.ready
    }; // pendingConnectionsCallback

    // Load up the pending connections
    $.ajax('/direct/profile/' + portal.user.id + '/incomingConnectionRequests.json', {cache: false})
      .done(function (data) {

        indexedPendingConnections = {};

        data.forEach(function (connection) {
          connection.incoming = true;
        });

        $.ajax('/direct/profile/' + portal.user.id + '/outgoingConnectionRequests.json', {cache: false})
          .done(function (outgoing) {

            outgoing.forEach(function (connection) {

              connection.outgoing = true;
              data.push(connection);
            });

            pendingConnectionsCallback(data);
          })
          .fail(function (jqXHR, textStatus, errorThrown) {
            console.log('Failed to get outgoing requests. errorThrown: ' + errorThrown);
          });
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        console.log('Failed to get incoming requests. errorThrown: ' + errorThrown);
      });

    searchBox.keyup(function (e) { search(this.value, false); });
    searchBox.keydown(function (e) {

      if (e.which == 13 && this.value.length >= 4) {
        $('#connection-manager-connectionsview-searchresults-more').click();
      }
    });
    moreSearchBox.keyup(function (e) { search(this.value, true); });

    if (options && options.state === 'pending') {
      showPendingTab();
    }
  }; // portal.connectionManager.show

  $('#Mrphs-userNav__submenuitem--connections').click(portal.connectionManager.show);
}) ($PBJQ);
/**
 * For the Sakai Footer
 */

/* Create the footer info popover and show server time on footer, if the popover exists */
$PBJQ(document).ready(function() {
	var footerDetails = $PBJQ('#Mrphs-footer--details__info');
	if (footerDetails.length === 1) {
		footerDetails.popover({
			html: true,
			content: function() {
				return $PBJQ('#Mrphs-footer--details__panelTemplate').html();
			}
		});
		footerDetails.click(function (e) {
			e.preventDefault();			// override # in href from popping to the top of the page
		});
	}

	updateFooterTime = (function() {
		if( $PBJQ('#preferredTime').length == 1 ) {
			var preferredTzDisplay= $PBJQ('#preferredTime').data('preferredtzdisplay');
			var preferredServerDateAndGMTOffset = new Date( parseInt( $PBJQ('#preferredTime').data('preferredserverdateandgmtoffset') ) );
			var preferredLocalOffset = preferredServerDateAndGMTOffset.getTime() - (new Date()).getTime(); 	
		}
		var serverTzDisplay= $PBJQ('#serverTime').data('servertzdisplay');
		var serverDateAndGMTOffset = new Date( parseInt( $PBJQ('#serverTime').data('serverdateandgmtoffset') ) );
		var serverLocalOffset = serverDateAndGMTOffset.getTime() - (new Date()).getTime();

		return function() {
			var offsetDate = new Date((new Date()).getTime() + serverLocalOffset);
			var dateString = offsetDate.toUTCString()
					.replace(/GMT/, serverTzDisplay)
					.replace(/UTC/, serverTzDisplay);

			$PBJQ('#serverTime').text(dateString);
	
			if( $PBJQ('#preferredTime').length == 1 ) {
				var offsetDate = new Date((new Date()).getTime() + preferredLocalOffset);
				var dateString = offsetDate.toUTCString()
						.replace(/GMT/, preferredTzDisplay)
						.replace(/UTC/, preferredTzDisplay);
	
				$PBJQ('#preferredTime').text(dateString);
			}
			
			setTimeout('updateFooterTime()', 1000);
		};

	})();

	if( $PBJQ('#serverTime').length == 1 ) {
		updateFooterTime();
	}
});(function ($) {

  if (!portal.loggedIn) {
    return;
  }


  window.sakai = window.sakai || {};
  window.sakai.translations = window.sakai.translations || {};

  portal.i18n.loadProperties = function (options) {

    if (!options.namespace) {
      console.error("You must supply at least a namespace. Doing nothing ...");
      return;
    }

    var defaults = {
      resourceClass: "org.sakaiproject.i18n.InternationalizedMessages",
      resourceBundle: "org.sakaiproject.".concat(options.namespace).concat(".bundle.Messages"),
      namespace: options.namespace
    };

    options = Object.assign(defaults, options);

    if (options.debug) {
      console.debug('resourceClass: ' + options.resourceClass);
      console.debug('resourceBundle: ' + options.resourceBundle);
      console.debug('namespace: ' + options.namespace);
    }

    window.sakai.translations[options.namespace] = window.sakai.translations[options.namespace] || {};

    var storageKey = portal.locale + options.resourceBundle;
    if (sessionStorage.getItem(storageKey) !== null) {
      if (options.debug) {
        console.debug("Returning " + storageKey + " from sessions storage ...");
      }
      window.sakai.translations[options.namespace] = JSON.parse(sessionStorage[storageKey]);
      if (options.callback) {
        options.callback();
      }
    } else {
      if (options.debug) {
        console.debug(storageKey + " not in sessions storage. Pulling from webservice ...");
      }
      $PBJQ.ajax({
        url: '/sakai-ws/rest/i18n/getI18nProperties' + portal.portalCDNQuery,
        cache: true,
        contentType: 'application/json',
        data: {locale: portal.locale, resourceclass: options.resourceClass, resourcebundle: options.resourceBundle},
      })
      .done(function (data, textStatus, jqXHR) {

        data.split("\n").forEach(function (pair) {

          var keyValue = pair.split('=');
          if (keyValue.length == 2) {
            window.sakai.translations[options.namespace][keyValue[0]] = keyValue[1];
          }

          if (options.debug) {
            console.debug('Updated translations: ');
            console.debug(window.sakai.translations[options.namespace]);
          }
        });
        sessionStorage[storageKey] = JSON.stringify(window.sakai.translations[options.namespace]);

          if (options.callback) {
            options.callback();
          }
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        console.error(errorThrown);
      });
    }
  }; // loadProperties

  portal.i18n.tr = function (namespace, key, options) {

    if (!namespace || !key) {
      console.error('You must supply a namespace and a key. Doing nothing.');
      return;
    }

    var ret = window.sakai.translations[namespace][key];

    if (!ret) {
      console.warn(namespace + '#key ' + key + ' not found. Returning key ...');
      return key;
    }

    if (options != undefined) {
      for (var prop in options) {
        ret = ret.replace('{'+prop+'}', options[prop]);
      }
    }
    return ret;
  };

  Handlebars.registerHelper('tr', function (namespace, key, options) {
      return new Handlebars.SafeString(portal.i18n.tr(namespace, key, options.hash));
  });
}) ($PBJQ);
/**
 * Sakai jQuery keyboard sortable from https://raw.githubusercontent.com/hanshillen/sakai-keyboardsortable/master/js/jquery.sakai.js
 */

$PBJQ(document).ready(function() {
  var _defaults = {
      /* strings */
      dragModeStartMsg : "drag start, Use U and D keys to move the item up and down",
      dragModeEndMsg: "Drag end",
      newPositionMsg: "Moved to position %s"
      
  };
  
  /* Extends sortable, allows drag operations through keyboard shortcuts */ 
  $PBJQ.widget("sakai.keyboardSortable", $PBJQ.ui.sortable, {
    options: {
      /* optional, a selector determining what focusable element inside the sortable item should be responding to drag shortcuts.
       * defaults to the sortable item itself */
      keyboardHandle: false 
    },

    _create: function() {
      this._super();
      this.options.keyboardHandle = this.options.keyboardHandle || this.options.items;
      this._dragging = false;
      this.element.on("keydown", this.options.keyboardHandle, $PBJQ.proxy(this._keydown, this));
      /* Live region used to provide feedback on drag actions to screen reader users*/
      this.liveRegion = $PBJQ("<div class='ui-helper-hidden-accessible'></div>").liveregion().appendTo(document.body);
      this.element.find(this.options.keyboardHandle).attr({
        "aria-grabbed": "false",
        // proprietary attribute that lets JAWS pass certain key strokes through
        "data-at-shortcutkeys": '{"u":"drag item up","d":"drag item down"}'
      }).blur($PBJQ.proxy(function(event) {
        var $target = $PBJQ(event.target);
        if (this._isDragging()) {
          this._toggleDragMode($target, this._closestSortableNode($target));
        }
      }, this)).click($PBJQ.proxy(function(event) {
        /* Allow drag mode to be toggled when click event is not generated by a mouse click */
        if (event.clientX <= 0 || event.clientX === undefined) {
          var $target = $PBJQ(event.target);
          this._toggleDragMode($target, this._closestSortableNode($target));
        }
      }, this));
    },

    _keydown: function(event) {
      if ($PBJQ.inArray(event.which, [ 27, 38, 40, 68, 85 ]) === -1) {
        return;
      }
      // If user is inside input box, don't prevent them from using U or D
      if ($PBJQ(event.target).is(':input')) {
        return;
      }
      event.preventDefault();
      var $target = $PBJQ(event.target);
      var $sortableNode = this._closestSortableNode($target);
      
      switch (event.which) {
      case 27: // Esc
        if (this._isDragging()) {
          this._toggleDragMode($target, $sortableNode);
        }
        break;
      case 38: // Up
      case 85: // u
        if (event.ctrlKey || this._isDragging() || event.which === 85) {
          this._moveBackward($sortableNode, $target);
        }
        break;
      case 40: // Down
      case 68: // d
        if (event.ctrlKey || this._isDragging() || event.which === 68) {
          this._moveForward($sortableNode, $target);
        }
        break;
      }
    },

    _closestSortableNode: function($node) {
      var $sortableNode = $node.parentsUntil(this.element).last();
      if (!$sortableNode.length) {
        $sortableNode = $node;
      }
      return $sortableNode
    },

    _isDragging: function() {
      return this._dragging;
    },

    _toggleDragMode: function($node, $sortableNode) {
      var dragging = this._isDragging();
      $sortableNode.toggleClass("sakai-dragging", !dragging);
      if (!dragging) {
        this.element.find(this.options.keyboardHandle).attr("aria-grabbed", "false");
        this._dragging = true;
        $node.attr("aria-grabbed", "true");
        this._notify(_defaults.dragModeStartMsg);
      } else {
        $node.attr("aria-grabbed", "false");
        this._dragging = false;
        this._notify(_defaults.dragModeEndMsg);
      }
    },

    _moveBackward: function($node, $focused, selector) {
      $prevNode = $node.prev(selector);
      if (!$prevNode.length) {
        return;
      }
      $prevNode.insertAfter($node);
      this._highlightDrag($node)
      this._notifyPosition($node);
    },

    _moveForward: function($node, $focused, selector) {
      $nextNode = $node.next(selector);
      if (!$nextNode.length) {
        return;
      }
      $nextNode.insertBefore($node);
      this._highlightDrag($node);
      this._notifyPosition($node);
    },
    
    _highlightDrag: function($node){
      if (this._isDragging()) {
        return;
      }
      $node.addClass("sakai-dragging-temp");
      setTimeout(function(){
        $node.removeClass("sakai-dragging-temp");
      }, 1000);
    },

    _notifyPosition: function($node) {
      var newIndex = this.element.find(this.options.items).index($node) + 1;
      this._notify(_defaults.newPositionMsg.replace("%s", newIndex));
    },
    _notify: function(msg) {
      this.liveRegion.liveregion("instance").notify(msg);
      this._trigger('update');
    }
  } );

  /* Creates a live region for quick notifications to screen reader users*/
  $PBJQ.widget("sakai.liveregion", {
    _create: function() {
      this.timeout = null;
    },

    notify: function(msg) {
      setTimeout($PBJQ.proxy(function() {
        /* some browser / screen reader combos don't honor aria-relevant="additions", so they will incrrectly announce messages being removed.
         * As a work around, create a separate live region for each message and add text to it after a short delay. */ 
        var $channel = $PBJQ("<div aria-live='polite'></div>").attr("role", "status").appendTo(this.element);
        if (this.timeout) {
          clearTimeout(this.timeout);
        }

        this.timeout = setTimeout($PBJQ.proxy(function() {
          $channel.text(msg);
        }, this), 500);
        setTimeout($PBJQ.proxy(function() {
          this._clear($channel);
        }, this), 10000);

      }, this), 0);
    },

    _clear: function($node) {
      $node.remove();
    }
  });
});
/**
 * For More Sites in Morpheus
 */

var selectSiteModalLinks, selectSiteLastModalInTab;

var dhtml_view_sites = function(){

  // first time through set up the DOM
  $PBJQ('#selectSiteModal').addClass('dhtml_more_tabs'); // move the selectSite in the DOM
  $PBJQ('.more-tab').position();
  var paneHeight = $PBJQ(window).height()*0.8;

  // then recast the function to the post initialized state which will run from then on
  dhtml_view_sites = function(){

    var modal = $PBJQ('#selectSiteModal');
    
    modal.show();

    // Find all focusable items
    if (typeof selectSiteModalLinks == 'undefined' || typeof selectSiteLastModalInTab == 'undefined') {
      selectSiteModalLinks = modal.find('button, a');
      selectSiteLastModalInTab = modal.find('.tab-box a:last');
    }

    // Lock the focus into the modal links
    modal.on('keydown', function (e) {
      var cancel = false;
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }
      switch(e.which) {
        case 27: // ESC
          closeDrawer();
          cancel = true;
          break;
        case 9: // TAB
          if (e.shiftKey) {
            if (e.target === selectSiteModalLinks[0]) {
              selectSiteModalLinks[selectSiteModalLinks.length - 1].focus();
              cancel = true;
            }
          } else {
            if (e.target === selectSiteModalLinks[selectSiteModalLinks.length - 1] || e.target === selectSiteLastModalInTab[selectSiteLastModalInTab.length - 1]) {
              selectSiteModalLinks[0].focus();
              cancel = true;
            }
          }
          break;
      }
      if (cancel) {
        e.preventDefault();
      }
    });
    
    if (modal.hasClass('outscreen') ) {
      $PBJQ('body').toggleClass('active-more-sites');

      // Align with the bottom of the main header in desktop mode
      var allSitesButton = $PBJQ('.view-all-sites-btn:visible');

      var topPadding = allSitesButton.height() + 5;

      if (allSitesButton.length > 0) {
        // Raise the button to keep it visible over the modal overlay
        allSitesButton.css('z-index', 1005);

        var topPosition = allSitesButton.offset().top - $PBJQ(window).scrollTop() + topPadding;
        var rightPosition = $PBJQ('body').outerWidth() - (allSitesButton.offset().left + allSitesButton.outerWidth());
        if( $PBJQ('html').attr('dir') !== "rtl" ){
          modal.css('top', topPosition).css('right', rightPosition);
        }else{
          modal.css('top', topPosition).css('left', $PBJQ('body').outerWidth() - rightPosition );
        }
      }
      
      modal.toggleClass('outscreen');
      
      // Adjust for our offset from the top of the screen
      paneHeight -= topPosition;

      // and adjust to show the bottom of the modal frame
      paneHeight -= parseInt(modal.css('padding-bottom'), 20);

      // Avoid auto zoom to focus text field on touch devices
      if (MorpheusViewportHelper.isNonPhone()) {
        $PBJQ('#txtSearch').focus();
      }

      createDHTMLMask(dhtml_view_sites);

      $PBJQ('.selectedTab').bind('click', function(e){
        dhtml_view_sites();
        return false;
      });

      $PBJQ('.tab-pane:first').focus();

      $PBJQ(document).trigger('view-sites-shown');
    }
    else {
      // hide the dropdown
      $PBJQ('body').toggleClass('active-more-sites');
      $PBJQ('#selectSiteModal').toggleClass('outscreen'); //hide the box

      // Restore the button's zIndex so it doesn't hover over other overlays
      var allSitesButton = $PBJQ('.view-all-sites-btn');
      allSitesButton.css('z-index', 'auto');

      $PBJQ('#selectSite').attr('tabindex', '-1');
      removeDHTMLMask()
      $PBJQ('#otherSiteTools').remove();
      $PBJQ('.selectedTab').unbind('click');
    }
    
  }
  
  
  if($PBJQ(window).width() < 800) {
	  paneHeight = paneHeight*0.85;
  }
  $PBJQ('.tab-pane').css('height', paneHeight);
  
  // finally run the inner function, first time through
  dhtml_view_sites();
}

function closeDrawer() {

  $PBJQ('#selectSiteModal').toggleClass('outscreen');  //hide the box
  removeDHTMLMask();
  $PBJQ('#selectSite').attr('tabindex', '-1');
  $PBJQ('#otherSiteTools').remove();
  $PBJQ('.selectedTab').unbind('click');
  $PBJQ('.moreSitesLink').unbind('keydown');

  // For desktop screen size
  if ($PBJQ('.view-all-sites-btn a:visible').length) {
    $PBJQ('.view-all-sites-btn a').focus();
  }
  else {
    $PBJQ('.js-toggle-sites-nav').focus();
  }

}

function createDHTMLMask(callback){
  $PBJQ('body').append('<div id="portalMask">&nbsp;</div>');

  $PBJQ('#portalMask')
  .css('height', browserSafeDocHeight())
  .css({
    'width': '100%',
    'z-index': 1000,
    'top': 0,
    'left': 0
  })
  .attr('tabindex', -1)
  .bind("click", function(event){
    callback();
    return false;
  });

  $PBJQ('#portalMask').bgiframe();
}

function removeDHTMLMask(){
  $PBJQ('#portalMask').remove();
}

/** Shows a drawer site tool dropdown **/
function showToolMenu(jqObj){
  var classId = jqObj.attr('id');
  // We need to escape special chars, like exclamations, or else $PBJQ selectors don't work.
  var id = classId.replace(/!/g,'\\!').replace(/~/g,'\\~');
  $PBJQ('.toolMenus').removeClass('toolMenusActive').attr('aria-expanded', 'false');

  if ($PBJQ('.' + id).length) {
    $PBJQ('#otherSiteTools').remove();
  } else {
    var subsubmenu_elt = $PBJQ('<ul id="otherSiteTools" role="menu" />').addClass(classId);
    var siteURL = '/direct/site/' + classId + '/pages.json';
    scroll(0, 0);
    var maxToolsInt = parseInt($PBJQ('#maxToolsInt').text());
    var maxToolsText = $PBJQ('#maxToolsText').text();

    var li_template = $PBJQ('<li class="otherSiteTool" >' +
                            '<span>' +
                            '<a role="menuitem" tabindex="-1"><span class="Mrphs-toolsNav__menuitem--icon"> </span></a>' +
                            '</span>' +
                            '</li>');

    var goToSite = li_template.clone();

    goToSite.addClass('gotosite');

    goToSite.find('a')
      .attr('href', portal.portalPath + '/site/' + classId)
      .attr('title', maxToolsText)
      .append(maxToolsText);

    goToSite.find('a span').addClass('icon-sakai--see-all-tools')

    $PBJQ.getJSON(siteURL, function(data){
      $PBJQ.each(data, function(i, item){

        if (!item.tools[0]) {
          // This item has a page with no tool.  Skip over it.
          return true;
        }

        if (i < maxToolsInt) {
          var li = li_template.clone();
          // Set the item URL and text
          li.find('a')
            .attr('href', item.tools[0].url)
            .attr('title', item.title)
            .append(item.title);

          // And its icon
          li.find('a span')
            .addClass('icon-sakai--' + item.tools[0].toolId.replace(/\./gi, '-'))
            .addClass('otherSiteToolIcon');

          if (item.toolpopup) {
            // For popups, we add an extra URL parameter and an onclick event
            li.find('a')
            .attr('href', item.tools[0].url + '?sakai.popup=yes')
            .attr('onclick', 'window.open(' + item.toolpopupurl + '); return false');
          }

          subsubmenu_elt.append(li);
        }
      });

      // If we couldn't show all the tools, offer a "go to site" link
      if (data.length > maxToolsInt) {
        subsubmenu_elt.append(goToSite.clone());
      }

      $PBJQ('#otherSiteTools').remove();
      jqObj.closest('li').append(subsubmenu_elt);
      // Move focus to first option and setup menu tools for arrow navigation
      jqObj.closest('li').find('ul li a').first().focus();
      addArrowNavAndDisableTabNav($PBJQ('ul#otherSiteTools'));

      jqObj.parent().find('.toolMenus').addClass("toolMenusActive").attr('aria-expanded', 'true');
    }); // end json call
  }
}

$PBJQ(document).ready(function(){

  if ($PBJQ('#eid').length === 1) {
    $PBJQ('#eid').focus()
  }

  // Open all Sites with mobile view
   $PBJQ(".js-toggle-sites-nav", "#skipNav").on("click", dhtml_view_sites);

  // Open all Sites with Desktop view
  $PBJQ("#show-all-sites, .view-all-sites-btn").on("click", dhtml_view_sites);

  // prepend site title to tool title
  // here as reminder to work on an actual breadcrumb integrated with neo style tool updates
  //var siteTitle = ($PBJQ('.nav-selected span:first').text())
  var siteTitle = portal.siteTitle;

  if (siteTitle) {
    if (portal.shortDescription) {
      siteTitle = siteTitle + " ("+portal.shortDescription+")"
    }

    $PBJQ('.portletTitle h2').prepend('<span class=\"siteTitle\">' + siteTitle + ':</span> ')
  }

  $PBJQ('#txtSearch').keyup(function(event){
    if (event.keyCode == 27) {
      resetSearch();
    }

    if ($PBJQ('#txtSearch').val().length > 0) {
      var queryString = $PBJQ('#txtSearch').val().toLowerCase();

      $PBJQ('.fav-sites-term, .fav-sites-entry').hide();

      var matched_sites = $PBJQ('.fav-sites-entry').filter(function (idx, entry) {
          return ($PBJQ('.fav-title a span.fullTitle', entry).text().toLowerCase().indexOf(queryString) >= 0);
      });

      matched_sites.show();
      matched_sites.closest('.fav-sites-term').show();
    }

    if ($PBJQ('#txtSearch').val().length == 0) {
      resetSearch();
    }

    // Should be <=1 if there is a header line
    if ($PBJQ('#otherSiteList li:visible').length < 1 && $PBJQ('.otherSitesCategorList li:visible').length < 1) {
      $PBJQ('.norecords').remove();
      $PBJQ('#noSearchResults').fadeIn('slow');
    }
  });

  function resetSearch(){
    $PBJQ('#txtSearch').val('');
    $PBJQ('.fav-sites-term, .fav-sites-entry').show();
    $PBJQ('#noSearchResults').hide();
    $PBJQ('#txtSearch').focus();
  }

  $PBJQ('#otherSiteSearchClear').on('click', function () {
      resetSearch();
  });

  //toggle presence panel
  $PBJQ("#presenceToggle").click(function(e){
    e.preventDefault();
    $PBJQ('#presenceArea').toggle();
  });

  //explicitly close presence panel
  $PBJQ('.trayPopupClose').click(function(e){
    e.preventDefault();
    $PBJQ(this).closest('.trayPopup').hide();
  });

  //bind directurl checkboxes
  if ( $PBJQ('a.tool-directurl').length ) $PBJQ('a.tool-directurl').cluetip({
    local: true,
    arrows: true,
    cluetipClass: 'jtip',
    sticky: true,
    cursor: 'pointer',
    activation: 'click',
    closePosition: 'title',
    closeText: '<img src="/library/image/silk/cross.png" alt="close">'
  });

});


$PBJQ(document).ready(function($){
  // The list of favorites currently stored
  var autoFavoritesEnabled = true;

  // Keep a copy of the favoritesList as it was before any changes were made.
  // If the user makes a set of changes that ultimately revert us back to where we
  // started, we don't need to show the indicator to reload the page.
  var initialFavoritesList = undefined;

  var favoritesList = [];

  var maxFavoriteEntries = $PBJQ('#max-favorite-entries').text().trim();

  // True if we've finished fetching and displaying the initial list
  //
  // Used to ensure we don't inadvertently save an empty list of favorites if
  // the user gets in too quickly
  var favoritesLoaded = false;

  var container = $PBJQ('#selectSite');
  var favoritesPane = $PBJQ('#otherSitesCategorWrap');
  var organizePane = $PBJQ('#organizeFavorites');
  var topNavPane = $PBJQ('#topnav');

  // Keep a copy of the order of the sites across the top bar in case a user
  // unpins and then repins a site to the top bar without refreshing: the order
  // of the sites should remain the same
  var setInitialTopBarSiteDisplayOrder = function() {
    return $PBJQ('.Mrphs-sitesNav__favbtn', topNavPane).map(function () {
      return $PBJQ(this).data('site-id');
    }).toArray();
  };
  
  var initialTopBarSiteDisplayOrder = setInitialTopBarSiteDisplayOrder();

  // Build up a map of siteid => list item.  Do this instead of an ID
  // selector to cope with Site IDs containing strange characters.
  var itemsBySiteId = {};
  $PBJQ('.site-favorite-btn', favoritesPane).each(function (i, e) {
    itemsBySiteId[$PBJQ(e).attr('data-site-id')] = $PBJQ(e).parent();
  });

  var button_states = {
    favorite: {
      markup: '<i class="site-favorite-icon site-favorite"></i>'
    },
    nonfavorite: {
      markup: '<i class="site-favorite-icon site-nonfavorite"></i>'
    },
    myworkspace: {
      markup: '<i class="site-favorite-icon site-workspace site-favorite"></i>'
    }
  };

  var getUserFavorites = function (callback) {
    $PBJQ.ajax({
      url: '/portal/favorites/list',
      method: 'GET',
      dataType: 'json',
      success: function (data) {
        autoFavoritesEnabled = data.autoFavoritesEnabled;

        favoritesList = data.favoriteSiteIds.filter(function (e, i) {
          return e != '';
        });

        if (initialFavoritesList == undefined) {
          initialFavoritesList = favoritesList;
        }

        callback(favoritesList);
      }
    });
  };

  var setButton = function (btn, state) {
    var entry = button_states[state];

    $PBJQ(btn).data('favorite-state', state);

    if (state === 'favorite') {
      $PBJQ(btn).attr('title', $PBJQ('#removeFromFavoritesText').text().replace("[site]", $PBJQ(btn).parent().find('span.fullTitle').text() ));
    } else if (state === 'nonfavorite') {
      $PBJQ(btn).attr('title', $PBJQ('#addToFavoritesText').text().replace("[site]", $PBJQ(btn).parent().find('span.fullTitle').text() ));
    } else {
      $PBJQ(btn).attr('title', null);
    }

    $PBJQ(btn).empty().append($PBJQ(entry.markup));
  };

  var renderFavoriteCount = function () {
    var favoriteCount = $PBJQ('.fav-sites-entry .site-favorite', favoritesPane).length;

    $PBJQ('.favoriteCount', container).text('(' + favoriteCount + ')');

    if (favoriteCount > maxFavoriteEntries) {
      $PBJQ('.favoriteCountAndWarning').addClass('maxFavoritesReached');
    } else {
      $PBJQ('.favoriteCountAndWarning').removeClass('maxFavoritesReached');
    }
  };

  var setAllOrNoneStarStates = function () {
    $PBJQ('.favorites-select-all-none', favoritesPane).each(function (idx, selectAllNone) {
      var termContainer = $PBJQ(selectAllNone).closest('.fav-sites-term');

      var siteCount = termContainer.find('.fav-sites-entry:not(.my-workspace)').length;
      var favoritedSiteCount = termContainer.find('.fav-sites-entry .site-favorite').length;

      if (siteCount == 0) {
        // No favoritable sites under this section
        $PBJQ(selectAllNone).hide();
      } else {
        if (favoritedSiteCount == siteCount) {
          $PBJQ(selectAllNone).data('favorite-state', 'favorite');
          $PBJQ(selectAllNone).html(button_states.favorite.markup);
        } else {
          $PBJQ(selectAllNone).data('favorite-state', 'nonfavorite');
          $PBJQ(selectAllNone).html(button_states.nonfavorite.markup);
        }

        $PBJQ(selectAllNone).show();
      }
    });
  };

  var hideFavoriteButtons = function () {
    $PBJQ('.site-favorite-btn', favoritesPane).empty();
    $PBJQ('.favorites-select-all-none', favoritesPane).empty();
  };

  var renderFavorites = function (favorites) {
    $PBJQ('.site-favorite-btn', favoritesPane).each(function (idx, btn) {
      var buttonSiteId = $PBJQ(btn).attr('data-site-id');

      if ($PBJQ(btn).closest('.my-workspace').length > 0) {
        setButton(btn, 'myworkspace');
      } else {
        if ($PBJQ.inArray(buttonSiteId, favorites) >= 0) {
          setButton(btn, 'favorite');
        } else {
          setButton(btn, 'nonfavorite');
        }
      }
    });

    $PBJQ('.favorites-help-text').hide();

    if (autoFavoritesEnabled) {
      $PBJQ('.favorites-help-text.autofavorite-enabled').show();
    } else {
      $PBJQ('.favorites-help-text.autofavorite-disabled').show();
    }

    setAllOrNoneStarStates();
    renderFavoriteCount();

    favoritesLoaded = true;
  };

  var listFavorites = function () {
    // Any favorite button with the 'site-favorite' class has been starred.
    return $PBJQ('.site-favorite-btn', favoritesPane).has('.site-favorite').map(function () {
      return $PBJQ(this).attr('data-site-id');
    }).toArray();
  }
  
  /**
   * @func syncFavoritesToServer
   * @desc Reusable method to sync fav changes to the server
   * @param {Array} favs  - List of SiteIds to be used as favourites
   * @param {Function} onError  - Error function to be called on AJAX failure 
   */
  var syncFavoritesToServer = function(favs, onError) {

    if (!onError) {
      onError = function (err) {};
    }
    
    var newState = {
      favoriteSiteIds: favs,
      autoFavoritesEnabled: autoFavoritesEnabled,
    };

    $PBJQ.ajax({
      url: '/portal/favorites/update',
      method: 'POST',
      data: {
        userFavorites: JSON.stringify(newState),
      },
      error: onError
    });

    // Update the list
    favoritesList = favs;
  }
        
  /**
   * @func topNavFavorite
   * @desc Toggles favouriting from the top navigation
   * @param {*} event  - jQuery Event for item clicked
   */
  var toggleTopNavFavorite = function(event) {
    event.preventDefault();
    
    var thisFavButton = $PBJQ(event.target);
    var newFavId = thisFavButton.data("site-id");
    
    getUserFavorites(function(list){
      var favs = list; 
      var ind = favs.indexOf(newFavId); 

      if(ind === -1) {
        // Add Fav
        var favIdIndex = initialTopBarSiteDisplayOrder.indexOf(newFavId);
        if(favIdIndex !== -1) {
          // Inserting the site id into the previous location of the favorites array to 
          // maintain the site's location on the top bar, if toggled off then back on 
          // without a page reload:
          favs.splice(favIdIndex, 0, newFavId);
        } else {
          // Was not in the original list of favorites, so we'll add the site to the end:
          favs.push(newFavId);
        }
      } else {
        // Remove Fav
        favs.splice(ind,1)
      }

      // Toggle the classes, so the opposite star appears
      thisFavButton.toggleClass("non-fav");
      thisFavButton.toggleClass("fav");
      
      // Use plain JS to toggle the value of the aria-checked attribute
      var thisFavButtonForJS = thisFavButton[0];
      if(thisFavButtonForJS.getAttribute("aria-checked") === "true") {
        thisFavButtonForJS.setAttribute("aria-checked", "false");
      } else {
        thisFavButtonForJS.setAttribute("aria-checked", "true");
      }
      
      syncFavoritesToServer(favs);
    });
  };

  // Add the fav toggle to the top-nav buttons
  $PBJQ(".Mrphs-sitesNav__favbtn").each(function(i, e) {
    return $PBJQ(e).click(toggleTopNavFavorite);
  });

  var loadFromServer = function (attempt) {
    if (syncInProgress) {
      // Don't let the user edit the current state if we know it's going to be invalidated.
      favoritesLoaded = false;
      hideFavoriteButtons();
    }

    if (!attempt) {
      attempt = 0;
    }

    if (syncInProgress && attempt < 100) {
      setTimeout(function () {
        loadFromServer(attempt + 1);
      }, 50);
    } else {
      getUserFavorites(renderFavorites);
    }
  };

  var arrayEqual = function (a1, a2) {
    if (a1.length != a2.length) {
      return false;
    }

    for (var i = 0; i < a1.length; i++) {
      if (a1[i] != a2[i]) {
        return false;
      }
    }

    return true;
  };

  var showRefreshNotification = function () {

    if (arrayEqual(favoritesList, initialFavoritesList)) {
      // The user is back to where they started!
      $PBJQ('.moresites-refresh-notification').remove();
      return;
    }

    if ($PBJQ('.moresites-refresh-notification').length > 0) {
      // Already got it
      return;
    }

    var notification = $PBJQ('<div class="moresites-refresh-notification" />')
        .html($PBJQ('#refreshNotificationText').html());

    $PBJQ("#loginLinks").prepend(notification);

    notification.css('top', ($PBJQ('.Mrphs-siteHierarchy').offset().top) + 'px');
  };

  var syncInProgress = false;
  var nextToSync = [];

  // The user might go crazy with the clicky, so queue our updates so they run
  // in a defined order.
  var runNextServerUpdate = function (onError) {
    var newState;

    // we can skip intermediate updates because they'll just get overwritten anyway.
    while (nextToSync.length > 0) {
      newState = nextToSync.shift();
    }

    if (newState) {
      $PBJQ.ajax({
        url: '/portal/favorites/update',
        method: 'POST',
        dataType: 'json',
        data: {
          userFavorites: JSON.stringify(newState),
        },
        error: onError,
        complete: runNextServerUpdate
      });
    } else {
      // All done!
      syncInProgress = false;
    }
  };

  var syncWithServer = function (onError) {
    if (!favoritesLoaded) {
      return;
    }

    if (!onError) {
      onError = function () {};
    }

    var newFavorites = listFavorites();

    // Retain the sort ordering of our original list, adding new items to the end
    newFavorites = newFavorites.sort(function (a, b) {
      if (favoritesList.indexOf(a) === -1) {
        return 1;
      } else if (favoritesList.indexOf(b) === -1) {
        return -1;
      } else {
        return favoritesList.indexOf(a) - favoritesList.indexOf(b);
      }
    });

    var newState = {
      favoriteSiteIds: newFavorites,
      autoFavoritesEnabled: autoFavoritesEnabled,
    };

    nextToSync.push(newState);

    if (syncInProgress) {
      /* It'll up our next state when it next runs */
    } else {
      syncInProgress = true;
      runNextServerUpdate(onError);
    };

    // Finally, update our stored list of favorites
    favoritesList = newFavorites;
    showRefreshNotification();
  };

  var returnElementToOriginalPositionIfPossible = function (siteId) {
    if (initialFavoritesList && initialFavoritesList.indexOf(siteId) > -1) {
      var idx = initialFavoritesList.indexOf(siteId);

      // We'll attempt to place our item to the right its original left
      // neighbor.  If the left neighbor was removed too, keep scanning left
      // until we find one of the original elements and place it to the right.
      // Otherwise, insert at the beginning of the array.
      //
      // The intention here is to allow multiple elements to be removed and
      // re-added in arbitrary order, and to reproduce the original ordering.

      var placed = false;

      for (var neighborIdx = idx - 1; neighborIdx >= 0; neighborIdx--) {
        var neighbor = initialFavoritesList[neighborIdx];

        var neighborCurrentIndex = favoritesList.indexOf(neighbor);

        if (neighborCurrentIndex >= 0 && neighborCurrentIndex < idx) {
          /* Place our element after it */
          favoritesList.splice(neighborCurrentIndex + 1, 0, siteId)
          placed = true;
          break;
        }
      }

      if (!placed) {
        // place at the beginning
        favoritesList.splice(idx, 0, siteId)
      }
    }
  };

  $PBJQ(favoritesPane).on('click', '.site-favorite-btn', function () {
    var self = this;

    var siteId = $PBJQ(self).attr('data-site-id');
    var originalState = $PBJQ(self).data('favorite-state');

    if (originalState === 'myworkspace') {
      // No unfavoriting your workspace!
      return;
    }

    var newState;

    if (originalState === 'favorite') {
      newState = 'nonfavorite';
    } else {
      newState = 'favorite';
    }

    // If a favorite has been added that was removed and re-added during this
    // same session, put it back in the same slot rather than sending it to the
    // end
    if (newState == 'favorite') {
      returnElementToOriginalPositionIfPossible(siteId);
    }

    setButton(self, newState);
    setAllOrNoneStarStates();
    renderFavoriteCount();

    syncWithServer(function () {
      // If anything goes wrong while saving, refresh from the server.
      loadFromServer();
    });
  });

  $PBJQ(favoritesPane).on('click', '.favorites-select-all-none', function () {
    var state = $PBJQ(this).data('favorite-state');
    var buttons = $PBJQ(this).closest('.fav-sites-term').find('.fav-sites-entry:not(.my-workspace) .site-favorite-btn');

    var newState;

    if (state == 'favorite') {
      newState = 'nonfavorite';
    } else {
      newState = 'favorite';
    }

    buttons.each(function (idx, button) {
      setButton($PBJQ(button), newState);
    });

    renderFavoriteCount();
    setAllOrNoneStarStates();

    syncWithServer(function () {
      // If anything goes wrong while saving, refresh from the server.
      loadFromServer();
    });
  });

  $PBJQ(container).on('click', '.tab-btn', function () {
    $PBJQ('.tab-btn', container).removeClass('active').attr('aria-selected', 'false').attr('tabindex', '-1');
    $PBJQ(this).addClass('active').attr('aria-selected', 'true').attr('tabindex', '0');

    var panel = $PBJQ(this).data('tab-target');

    $PBJQ('.tab-box').hide();
    $PBJQ(container).trigger('tab-shown', panel);
    $PBJQ('#' + panel).show();
  });

  // Arrow and spacebar nav for tabs
  $PBJQ(container).on('keydown', '.tab-btn', function (e) {
    if (e.keyCode == 32) {
      $PBJQ(this).click();
      e.preventDefault();
    }
    if (e.keyCode == 37) {
      $PBJQ("[aria-selected=true]").prev().click().focus();
      e.preventDefault();
    }
    if (e.keyCode == 38) {
      $PBJQ("[aria-selected=true]").prev().click().focus();
      e.preventDefault();
    }
    if (e.keyCode == 39) {
      $PBJQ("[aria-selected=true]").next().click().focus();
      e.preventDefault();
    }
    if (e.keyCode == 40) {
      $PBJQ("[aria-selected=true]").next().click().focus();
      e.preventDefault();
    }
  });

  $PBJQ(document).on('view-sites-shown', function () {
    loadFromServer();
  });

  $PBJQ(container).on('tab-shown', function (e, panelId) {
    if (panelId === 'organizeFavorites') {
      // Build our organize favorites screen based on the current set of
      // favorites
      var list = $PBJQ('#organizeFavoritesList');
      list.empty();

      $PBJQ('#noFavoritesToShow').hide();
      $PBJQ('#favoritesToShow').hide();

      // Collapse any visible tool menus
      $PBJQ('#otherSiteTools').remove();

      $PBJQ('#organizeFavoritesPurgatoryList').empty();

      $PBJQ.each(favoritesList, function (idx, siteid) {
        if (!itemsBySiteId[siteid]) {
          // Skip any favorite site that wasn't properly found for some reason
          // (this might happen if the user's favorites list contains sites that
          // they've had their access revoked from)
          return;
        }

        if ($PBJQ(itemsBySiteId[siteid]).hasClass('my-workspace')) {
          // Don't show an entry for the user's workspace since it can't be rearranged anyway.
          return;
        }

        var favoriteItem = itemsBySiteId[siteid].clone(false);

        favoriteItem.addClass('organize-favorite-item').data('site-id', siteid);
        var dragHandle = $PBJQ('<a href="javascript:void(0);" class="fav-drag-handle"><i class="fa fa-bars"></i></a>');

        // Hide the tool dropdown
        $PBJQ('.toolMenus', favoriteItem).remove();

        // Show a drag handle
        favoriteItem.append(dragHandle);

        list.append(favoriteItem);

        // Make sure the item is visible, just in case it was hidden on the other tab
        favoriteItem.show();
      });

      if (list.find('li').length == 0) {
        // No favorites are present
        $PBJQ('#noFavoritesToShow').show();
      } else {
        $PBJQ('#favoritesToShow').show();
      }

      var highlightMaxItems = function () {
        var items = $PBJQ('.organize-favorite-item');

        items.removeClass('site-favorite-is-past-max');
        $PBJQ('.favorites-max-marker').remove();

        $PBJQ.each(items, function (idx, li) {
          if (idx >= maxFavoriteEntries) {
            $PBJQ(li).addClass('site-favorite-is-past-max');
          }

          if (idx == maxFavoriteEntries) {
            $PBJQ(li).before($PBJQ('<li class="favorites-max-marker"><i class="fa fa-warning warning-icon"></i> ' + $PBJQ('#maxFavoritesLimitReachedText').text() + '</li>'));
          }
        });
      };

      highlightMaxItems();

      list.keyboardSortable({
        items: "li:not(.favorites-max-marker)",
        handle: ".fav-drag-handle",
        update: function () {
          // Rehighlight the first N items
          highlightMaxItems();

          // Update our ordering based on the new selection
          favoritesList = list.find('.organize-favorite-item *[data-site-id]').map(function () {
            return $PBJQ(this).attr('data-site-id');
          }).toArray();

          // and send it all to the server
          syncWithServer();
        }
      });

      list.disableSelection();

      $PBJQ('#autoFavoritesEnabled').attr('aria-checked', autoFavoritesEnabled);
      $PBJQ('#organizeFavorites .onoffswitch').show();
    }
  });

  $PBJQ(favoritesPane).on('click', '.toolMenus', function (e) {
    e.preventDefault();
    showToolMenu($PBJQ(this));
    return false;
  });

  $PBJQ(organizePane).on('click', '.site-favorite-btn', function () {
    var self = this;

    if ($PBJQ(self).closest('.my-workspace').length > 0) {
      // No unfavoriting your workspace!
      return;
    }

    var li = $PBJQ(self).parent();

    var buttonState;

    if ($PBJQ(self).closest('#organizeFavoritesList').length == 0) {
      // The clicked item was currently in "purgatory", having been unfavorited
      // in the process of organizing favorites.  This click will promote it
      // back to a favorite
      var siteId = $PBJQ(self).attr('data-site-id');
      returnElementToOriginalPositionIfPossible(siteId)

      var newIndex = favoritesList.indexOf(siteId);

      if (newIndex == 0) {
        $PBJQ('#organizeFavoritesList').prepend(li);
      } else if (newIndex > 0) {
        // Put it into the right position (note: nth-child starts indexing at 1)
        $PBJQ('#organizeFavoritesList li:nth-child(' + newIndex + ')').after(li);
      } else {
        // Just tack it on the end
        $PBJQ('#organizeFavoritesList').append(li);
      }

      buttonState = 'favorite';
    } else {
      // This item has just been unfavorited.  To purgatory!
      $PBJQ('#organizeFavoritesPurgatoryList').append(li);
      buttonState = 'nonfavorite';
    }


    // Set the favorite state for both the entry under "Organize" and the
    // original entry under "Sites"
    setButton(self, buttonState);
    setButton(itemsBySiteId[$PBJQ(self).attr('data-site-id')].find('.site-favorite-btn'),
              buttonState);

    setAllOrNoneStarStates();
    renderFavoriteCount();

    syncWithServer(function () {
      // If anything goes wrong while saving, refresh from the server.
      loadFromServer();
    });

  });

  $PBJQ("#autoFavoritesEnabled").click(function() {
	$PBJQ(this).attr('aria-checked', function(index, clicked) {
		var pressed = (clicked === 'true');
		return String(!pressed);
	});
	$PBJQ(this).trigger('change');
  });

  $PBJQ('#autoFavoritesEnabled').on('change', function () {
    autoFavoritesEnabled = $PBJQ(this).attr('aria-checked') === 'true';

    $PBJQ('.favorites-help-text').hide();

    if (autoFavoritesEnabled) {
      $PBJQ('.favorites-help-text.autofavorite-enabled').show();
    } else {
      $PBJQ('.favorites-help-text.autofavorite-disabled').show();
    }

    syncWithServer();
    return true;
  })

  $PBJQ('.otherSitesMenuClose').on('click', function () {
    // Close the pane
    dhtml_view_sites();
  });

});
/*
 * Copyright (c) 2008-2012 The Sakai Foundation
 *
 * Licensed under the Educational Community License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *             http://www.osedu.org/licenses/ECL-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var profile = profile || {};

(function ($) {

  profile.requestFriend = function (requestorId, friendId, callback) {

    return new Promise((resolve, reject) => {

      $.ajax( {
        url: "/direct/profile/" + requestorId + "/requestFriend?friendId=" + friendId,
        dataType: "text",
        cache: false } )
          .done(function (data, textStatus, jqXHR) {

            $('#profile-popup-request-button-' + friendId).hide();
            $('#profile-popup-cancel-button-' + friendId).show();
            if (callback) callback(friendId);
            resolve(true);
          })
          .fail((jqXHR, textStatus, errorThrown) => reject());
    });
  };

  profile.confirmFriendRequest = function (requestorId, friendId, callback) {

    return new Promise((resolve, reject) => {

      $.ajax( {
        url : "/direct/profile/" + requestorId + "/confirmFriendRequest?friendId=" + friendId,
        dataType : "text",
        cache: false })
          .done(function (data, textStatus, jqXHR) {

            $('#profile-popup-incoming-block-' + friendId).hide();
            $('#profile-popup-remove-button-' + friendId).show();
            if (callback) callback(friendId);
            resolve(true);
          })
          .fail((jqXHR, textStatus, errorThrown) => reject());
    });
  };

  profile.removeFriend = function (removerId, friendId, callback, displayName) {

    return new Promise((resolve, reject) => {

      $.ajax( {
        url : "/direct/profile/" + removerId + "/removeFriend?friendId=" + friendId,
        dataType : "text",
        cache: false })
          .done(function (data, textStatus, jqXHR) {

            $('#profile-popup-remove-button-' + friendId).hide();
            $('#profile-popup-request-button-' + friendId).show();
            if (callback) callback(friendId);
            resolve(true);
          })
          .fail((jqXHR, textStatus, errorThrown) => reject());
    });
  };

  profile.ignoreFriendRequest = function (removerId, friendId, cancel, callback) {

    return new Promise((resolve, reject) => {

      $.ajax( {
        url : '/direct/profile/' + removerId + '/ignoreFriendRequest?friendId=' + friendId,
        cache: false })
          .done(function (data, textStatus, jqXHR) {

            if (cancel !== undefined && cancel == true) {
              $('#profile-popup-cancel-button-' + removerId).hide();
              $('#profile-popup-request-button-' + removerId).show();
              if (callback) callback(removerId);
            } else {
              $('#profile-popup-incoming-block-' + friendId).hide();
              $('#profile-popup-request-button-' + friendId).show();
              if (callback) callback(friendId);
            }
            resolve(true);
          })
          .fail((jqXHR, textStatus, errorThrown) => reject());
    });
  };

  /**
   * Takes a jQuery array of the elements you want to attach a profile popup to. Each element must
   * have data attributes with the user's user UUID. You can also supply an object of callback
   * functions. Currently only connect is supported. You can also control where the qtip is anchored
   * by marking a descendant element with the class 'profile-popup-target'. The first descendant of this
   * type will be used as the anchor.
   *
   * eg: profile.attachPopups($PBJQ('.profile-popup'), {connect: myConnectCallback});
   *
   * @param jqArray An array of jQuery objects.
   */
  profile.attachPopups = function (jqArray, options) {

    if (!(jqArray instanceof $)) {
        console.log('profile.attachPopups takes a jQuery object array, from a selector');
        return;
    }

    if (!options) options = {};

    var hide = options.hide;

    var callbacks = options.callbacks;

    if (!callbacks) callbacks = {};

    jqArray.each(function () {

      var userId = this.dataset.userId;
      var callbackDisplayName = this.dataset.displayName;

      var targets = $(this).find('.profile-popup-target');
      var target = (targets.length > 0) ? targets.eq(0) : $(this);
      var position = {
        target: target,
        my: 'top left',
        at: 'bottom center',
        viewport: $(window),
        adjust: { method: 'flipinvert none'}
      };

      if (options && options.container) {
        position.container = $(`#${options.container}`);
      }

      $(this).qtip({
        position: position,
        show: { event: 'click', delay: 0 },
        style: { classes: 'profile-popup-qtip qtip-shadow' },
        hide: { event: 'click unfocus' },
        content: {
          text: function (event, api) {

            return $.ajax( { url: "/direct/portal/" + userId + "/formatted", cache: false })
              .then(function (html) {
                  return html;
                }, function (xhr, status, error) {
                    api.set('content.text', status + ': ' + error);
                });
          }
        },
        events: {
          visible: function (event, api) {

            $('#profile-popup-request-button-' + userId).off("click").on("click", (e) => {
              profile.requestFriend(portal.user.id, userId, callbacks.connect)
                .then(() => { if (hide) api.hide() });
            });
            $('#profile-popup-cancel-button-' + userId).off("click").on("click", (e) => {
              profile.ignoreFriendRequest(userId, portal.user.id, true, callbacks.cancel)
                .then(() => { if (hide) api.hide() });
            });
            $('#profile-popup-accept-button-' + userId).off("click").on("click", (e) => {
              profile.confirmFriendRequest(portal.user.id, userId, callbacks.accept)
                .then(() => { if (hide) api.hide() });
            });
            $('#profile-popup-ignore-button-' + userId).off("click").on("click", (e) => {
              profile.ignoreFriendRequest(portal.user.id, userId, false, callbacks.ignore)
                .then(() => { if (hide) api.hide() });
            });
            $('#profile-popup-remove-button-' + userId).off("click").on("click", (e) => {
              profile.removeFriend(portal.user.id, userId, callbacks.remove)
                .then(() => { if (hide) api.hide() });
            });
          }
        }
      });
    });
  };
}) ($PBJQ);
/**
 * For Publishing sites in Morpheus
 */

function publishSite(siteId) { 

  var reqUrl = '/direct/site/'+siteId+"/edit"; 
  var resp = $PBJQ.ajax({ 
    type: 'POST', 
    data: 'published=true', 
    url: reqUrl, 
    success: function() { location.reload(); } 
  }).responseText; 

}
// * For Quick Links in Morpheus
// */

function quickLinksNavEscHandler(e){
  if (e.keyCode === 27) { // esc keycode
    toggleQuickLinksNav(e);
  }
}

function toggleQuickLinksNav(event){
  event.preventDefault();

  // Hide the user nav panel as necessary for mobile screen display
  if (!$PBJQ('.Mrphs-userNav__subnav').hasClass('is-hidden')) {
    toggleUserNav(event);
  }

  $PBJQ('.Mrphs-quickLinksNav__subnav').toggleClass('is-hidden');

  if (!$PBJQ('.Mrphs-quickLinksNav__subnav').hasClass('is-hidden')) {

    // Add an invisible overlay to allow clicks to close the dropdown
    var overlay = $PBJQ('<div class="quicklinks-dropdown-overlay" />');
    overlay.on('click', function (e) {toggleQuickLinksNav(e)});
    $PBJQ('body').prepend(overlay);

    // Prevent scrolling of the background.
    $PBJQ('body').css('overflow-y', 'hidden');

    // ESC key also closes it
    $PBJQ(document).on('keyup',quickLinksNavEscHandler);

    // Set max height so that scroll bar appears if necessary.
    $PBJQ('.tab-box').css('max-height', window.innerHeight - $PBJQ('#selectQuickLink').offset().top - 14);

  } else {
    $PBJQ('.quicklinks-dropdown-overlay').remove();
    $PBJQ('body').css('overflow-y', 'visible');
    $PBJQ(document).off('keyup',quickLinksNavEscHandler);
  }
}

$PBJQ('#quickLinks-close').on('click', toggleQuickLinksNav);
$PBJQ(".js-toggle-quick-links-nav").on("click", toggleQuickLinksNav);$PBJQ(document).ready(function(){
    if ($PBJQ('[id$="reorder-list"] .reorder-element').size() - 1 > 15) {
        $PBJQ('.grabHandle').show();
        $PBJQ('#inputFieldMessage').show();
        $PBJQ('#inputKbdMessage').remove();
    }
    //get the initial order TODO - make an  array instead of putting the values in a span
    $PBJQ('[id$="reorder-list"] .reorder-element').each(function(n){
        $PBJQ('#lastMoveArrayInit').append($PBJQ(this).attr('id') + ' ');
        $PBJQ('#lastMoveArray').append($PBJQ(this).attr('id') + ' ');
    });
    
    //allow user to click on a field to edit
    $PBJQ('input[id^="index"]').click(function(event){
        event.stopPropagation();
    });
    //trap return key
    $PBJQ('input[id^="index"]').bind("keypress", function(e){
        var code = e.charCode || e.keyCode;
        return (code == 13) ? false : true;
    });
    
    $PBJQ('#undo-all').click(function(event){
        var initOrder;
        initOrder = $PBJQ.trim($PBJQ('#lastMoveArrayInit').text()).split(" ");
        for (z in initOrder) {
            thisRow = document.getElementById(initOrder[z]);
            $PBJQ(thisRow).appendTo('[id$="reorder-list"]');
        }
        
        event.preventDefault();
        registerChange();
        $PBJQ('#undo-all').hide();
        $PBJQ('#undo-all-inact').show();
        $PBJQ('#undo-last-inact').show();
        $PBJQ('#undo-last').hide();
    });
    $PBJQ('#undo-last').click(function(event){
        var prevOrder;
        var lastMovedT;
        var lastMoved;
        prevOrder = $PBJQ.trim($PBJQ('#lastMoveArray').text()).split(" ");
        for (z in prevOrder) {
            thisRow = document.getElementById(prevOrder[z]);
            $PBJQ(thisRow).appendTo('[id$="reorder-list"]');
        }
        lastMovedT = $PBJQ.trim($PBJQ('#lastItemMoved').text());
        lastMoved = $PBJQ('.reorder-element:eq(' + lastMovedT.substr(20) + ')');
        $PBJQ(lastMoved).addClass('recentMove');
        event.preventDefault();
        registerChange('notfluid', lastMoved);
        $PBJQ('#undo-last-inact').fadeIn('slow');
        $PBJQ('#undo-last').hide();
    });
    
    
    
    // handle changing the order text field
    $PBJQ('input[id^="index"]').change(function(){
        // get existing order
        var that = this;
        preserveStatus();
        //what the value was (plucked from a hidden input)
        var oldVal = parseInt($PBJQ(this).siblings('input[id^="holder"]').attr('value'));
        // the new value in the text field
        var newVal = parseInt(this.value);
        if (isNaN(newVal) || newVal > $PBJQ('input[id^="index"]').size()) {
            var failedValidMessage = $PBJQ('#failedValidMessage').text();
            $PBJQ('#messageHolder').text(failedValidMessage.replace('#', $PBJQ('input[id^="index"]').size()));
            $PBJQ('.orderable-selected').removeClass('orderable-selected');
            $PBJQ('#messageHolder').removeClass('messageSuccess');
            $PBJQ('#messageHolder').addClass('messageValidation');
			var messagePos = $PBJQ(that).position();
			$PBJQ("#messageHolder").css({
				'position':'absolute',
				'height':'1.3em',
				'top':messagePos.top,
				'left':55
			});
            $PBJQ('#messageHolder').fadeIn('slow');
            $PBJQ("#messageHolder").animate({
                opacity: 1.0
            }, 2000, function(){
                $PBJQ(that).val(oldVal);
                that.focus();
                that.select();
            });
            $PBJQ("#messageHolder").fadeOut('slow');
            $PBJQ(this).parents('.reorder-element').addClass('orderable-selected');
            return (null);
        }
        
        var inputs = $PBJQ('input[id^="index"]');
        // handle the things that happen after a move
        $PBJQ('#undo-last').fadeIn('slow');
        $PBJQ('#undo-last-inact').hide();
        $PBJQ('#undo-all').fadeIn('slow');
        $PBJQ('#undo-all-inact').hide();
        
        //insert the row in new location - if new value is 1, insert before, if it is the last possible
        // insert after, otherwise insert before or after depending on if it is going up or down
        if (newVal === '1') {
            $PBJQ($PBJQ(this).parents('.reorder-element')).insertBefore($PBJQ(this).parents('.reorder-element').siblings('.reorder-element').children('span').children('input[value=' + newVal + ']').parents('.reorder-element'));
        }
        else 
            if (newVal == inputs.length) {
                $PBJQ($PBJQ(this).parents('.reorder-element')).insertAfter($PBJQ(this).parents('.reorder-element').siblings('.reorder-element').children('span').children('input[value=' + newVal + ']').parents('.reorder-element'));
            }
            else {
                if (newVal > oldVal) {
                    $PBJQ($PBJQ(this).parents('.reorder-element')).insertAfter($PBJQ(this).parents('.reorder-element').siblings('.reorder-element').children('span').children('input[value=' + newVal + ']').parents('.reorder-element'));
                }
                else {
                    $PBJQ($PBJQ(this).parents('.reorder-element')).insertBefore($PBJQ(this).parents('.reorder-element').siblings('.reorder-element').children('span').children('input[value=' + newVal + ']').parents('.reorder-element'));
                }
            }
        registerChange('notfluid', $PBJQ(this).parents('.reorder-element'));
    });

    // the jquery-ui sortable initialization
    return $PBJQ('[id$="reorder-list"]').keyboardSortable({
      items: '.reorder-element:not(.notsortable)',
      start: function( event, ui ) {
        preserveStatus(ui);
      },
      update: function( event, ui ) {
        registerChange(event, ui);
      },
    });
});


// handle things that happen after a move
var registerChange = function(originEvent, movedEl){

    var rows = $PBJQ('[id$="reorder-list"] .reorder-element').size();
    if (originEvent !== 'notfluid') {
        movedEl = $PBJQ(document.activeElement).closest('[id^="ui-id-"]');
    }
    
    $PBJQ('#lastItemMoved').text($PBJQ(movedEl).attr('id')).trigger('change');
    
    $PBJQ(movedEl).addClass('recentMove');
    var newVal = 0;
    newVal = $PBJQ((movedEl).prevAll('.reorder-element').length + 1);
    // change the value of all the text fields (and value holders) to reflect new order
    var inputsX = $PBJQ('input[id^="index"]');
    var holderinputs = $PBJQ('input[id^="holder"]');
    var selectItems = $PBJQ("select.selectSet");
    for (var i = 0; i < inputsX.length; i = i + 1) {
        $PBJQ(inputsX[i]).attr("value", i + 1).val(i + 1);
    }
    for (var x = 0; x < holderinputs.length; x = x + 1) {
        $PBJQ(holderinputs[x]).attr("value", x + 1).val(x + 1);
    }
    for (var y = 0; y < selectItems.length; y = y + 1) {
        $PBJQ(selectItems[y]).val(y + 1);
        $PBJQ(selectItems[y]).find("option").removeAttr('selected');
        $PBJQ(selectItems[y]).find("option[value="+(y + 1)+"]").attr('selected', 'selected');
    }
    
    $PBJQ('#undo-last').fadeIn('slow');
    $PBJQ('#undo-last-inact').hide();
    $PBJQ('#undo-all').fadeIn('slow');
    $PBJQ('#undo-all-inact').hide();
    $PBJQ(movedEl).animate({
        opacity: 1.0
    }, 2000, function(){
        $PBJQ(movedEl).removeClass('recentMove');
    });
};



var preserveStatus = function(item){
    $PBJQ('#lastMoveArray').text('');
    $PBJQ('[id$="reorder-list"] .reorder-element').each(function(n){
        if ($PBJQ(this).attr('id') !== undefined && $PBJQ(this).attr('id') !== 'undefined_avatar') {
            $PBJQ('#lastMoveArray').append($PBJQ(this).attr('id') + ' ');
        }
    });
};


/**
 * For Responsive Menus in Morpheus: Adds classes to the <body>
 */

function toggleToolsNav(event){
  if (event) {
    event.preventDefault();
  }
    
  $PBJQ('body').toggleClass('toolsNav--displayed');
  if ($PBJQ('body').hasClass('toolsNav--displayed')) {
    /* Add the mask to grey out the top headers - re-use code in more.sites.js */
    createDHTMLMask(toggleToolsNav)
  }else{
    removeDHTMLMask();
  }
}

$PBJQ(document).ready(function(){


  function setupRoleSwitcherAsMenu() {
    function closeTheRoleSwitchToggle() {
        if ($PBJQ('#roleSwitchDropDown').is('.open')) {
            $PBJQ('#roleSwitchDropDownToggle').trigger('click');
        }
    };

    function handleKeyUp(event) {
        if (event.keyCode == 27) {
            closeTheRoleSwitchToggle();
            return false;
        }
        return true;
    };

    // Setup the initial ARIA attributes
    $PBJQ('#roleSwitchDropDownToggle').attr('aria-hidden', 'false').attr('aria-haspopup', 'true');
    $PBJQ('#roleSwitchDropDown').attr('aria-hidden', 'true');

    $PBJQ('#roleSwitchDropDownToggle').click( function(){
      $PBJQ('#roleSwitchDropDown').css('right', $PBJQ(window).width() - 20 - ($PBJQ('#roleSwitchDropDownToggle').offset().left + $PBJQ('#roleSwitchDropDownToggle').width()));
      $PBJQ('#roleSwitchDropDown').toggleClass('open');
      if ($PBJQ('#roleSwitchDropDown').is('.open')) {
          $PBJQ('#roleSwitchDropDown').attr('aria-hidden', 'false');
          $PBJQ(document.body).prepend('<div class="user-dropdown-overlay"></div>');
          $PBJQ('.user-dropdown-overlay').on('click', function() {
              closeTheRoleSwitchToggle();
          });
          $PBJQ(document.body).on('keyup', handleKeyUp);
          setTimeout(function() {
              $PBJQ('#roleSwitchDropDown').find('a, :input').focus();
          });
      } else {
         $PBJQ('#roleSwitchDropDown').attr('aria-hidden', 'true');
         $PBJQ('.user-dropdown-overlay').remove();
         $PBJQ(document.body).off('keyup', handleKeyUp);
         $PBJQ('#roleSwitchDropDownToggle').focus();
      }
    });
  };

  $PBJQ('#roleSwitchSelect').on("change", function(){
    if( $PBJQ('option:selected', this ).text() !== '' ){
      document.location = $PBJQ('option:selected', this ).val() + '#roleSwitch';
    }else{
      $PBJQ(this)[0].selectedIndex = 0;
    }
  });

  if(MorpheusViewportHelper.isPhone()) {
    setupRoleSwitcherAsMenu();
  } else {
    // if the menu has not be setup, then don't show the toggle if the
    // page is resized to the mobile viewport size
    $PBJQ('#roleSwitch').addClass('menu-not-setup');
  }

});

$PBJQ(".js-toggle-tools-nav", "#skipNav").on("click", toggleToolsNav);
/**
 * For Session and Timeouts in Morpheus
 */

//For SAK-13987
//For SAK-16162
//Just use the EB current.json as the session id rather than trying to do a search/replace
var sessionId = "current";
var sessionTimeOut;
var timeoutDialogEnabled = false;
var timeoutDialogFragment;
var timeoutDialogWarningTime;
var timeoutLoggedoutUrl;
var timeoutPortalPath;

$PBJQ(document).ready(function(){

  // note a session exists whether the user is logged in or no
  if (portal.loggedIn && portal.timeoutDialog) {
    setTimeout('setup_timeout_config();', 300000);
  }

});

var setup_timeout_config = function(){

  if ( ! portal || ! portal.timeoutDialog ) return; // SAK-42250
  timeoutDialogEnabled = portal.timeoutDialog.enabled;
  timeoutDialogWarningTime = portal.timeoutDialog.seconds;
  timeoutLoggedoutUrl = portal.loggedOutUrl;
  timeoutPortalPath = portal.portalPath;

  if (timeoutDialogEnabled == true) {
    poll_session_data();
  }

}

var poll_session_data = function(){

  $PBJQ.ajax({
    url: "/direct/session/" + sessionId + ".json?auto=true", //auto=true makes it not refresh the session lastaccessedtime
    dataType: "json",
    cache: false,
    success: function(data){
      //get the maxInactiveInterval in the same ms
      data.maxInactiveInterval = data.maxInactiveInterval * 1000;

      if (data.active && data.userId != null && data.lastAccessedTime + data.maxInactiveInterval > data.currentTime) {

        //User is logged in, so now determine how much time is left
        var remaining = data.lastAccessedTime + data.maxInactiveInterval - data.currentTime;

        //If time remaining is less than timeoutDialogWarningTime minutes, show/update dialog box
        if (remaining < timeoutDialogWarningTime * 1000) {

          //we are within 5 min now - show popup
          min = Math.round(remaining / (1000 * 60));

          if (!timeoutDialogFragment) {
            $PBJQ.ajax({ url: "/portal/timeout?auto=true", cache: true, dataType: "text"})
              .done(function(htmlSegment) {
                timeoutDialogFragment = htmlSegment;
                show_timeout_alert(min);
              })
              .fail(function() {
                timeoutDialogEnabled = false;
              });
          } else {
            show_timeout_alert(min);
          }

          clearTimeout(sessionTimeOut);
          sessionTimeOut = setTimeout("poll_session_data()", Math.max( (remaining/2), (1000 * 60) ) );

        } else {

          //more than timeoutDialogWarningTime min away
          clearTimeout(sessionTimeOut);
          sessionTimeOut = setTimeout("poll_session_data()", (remaining - timeoutDialogWarningTime * 1000));

        }
      } else if (data.userId == null) {
          // if data.userId is null, the session is done; redirect the user to logoutUrl
          location.href = timeoutLoggedoutUrl;
          
        } else {
          //the timeout length has occurred, but there is a slight delay, do this until there isn't a user.
          sessionTimeOut = setTimeout("poll_session_data()", 1000 * 10);
        }
    },
 
    error: function(XMLHttpRequest, status, error){
      // We used to to 404 handling here but now we should always get good session data.
    }

  });
}

function keep_session_alive(){
  dismiss_session_alert();
  $PBJQ.get(timeoutPortalPath);
}

var dismiss_session_alert = function(){
  removeDHTMLMask();
  $PBJQ("#timeout_alert_body").remove();
}

function show_timeout_alert(min){
  if (!timeoutDialogEnabled || !timeoutDialogFragment) {
    return;
  }
  
  if (!$PBJQ("#portalMask").get(0)) {
    createDHTMLMask(dismiss_session_alert);
    $PBJQ("#portalMask").css("z-index", 1000);
  }
  if ($PBJQ("#timeout_alert_body").get(0)) {
    //its there, just update the min
    $PBJQ("#timeout_alert_body span").html(min);
  }
  else {
    var dialog = timeoutDialogFragment.replace("{0}", min);
    $PBJQ("body").append(dialog);
  }
}
/**
 * For Short URL toggles in Morpheus
 */

//handles showing either the short url or the full url, depending on the state of the checkbox 
//(if configured, otherwise returns url as-is as according to the url shortening entity provder)
function toggleShortUrlOutput(defaultUrl, checkbox, textbox) {    
  
  if($PBJQ(checkbox).is(':checked')) {
    
    $PBJQ.ajax({
      url:'/direct/url/shorten?path='+encodeURI(defaultUrl),
      dataType: "text",
      success: function(shortUrl) {
        $PBJQ('.'+textbox).val(shortUrl);
      }
    }); 
  } else {
    $PBJQ('.'+textbox).val(defaultUrl);
  }
}

$PBJQ(document).ready(function(){
  $PBJQ('.Mrphs-toolTitleNav__link--directurl').click( function( e ){
    var origin = $PBJQ(this).position(),
    	$dialog = $PBJQ(this).siblings('.Mrphs-directUrl'); 
    
    $dialog.toggleClass('active').css( { 'left' : origin.left + 'px' } );
    $dialog.attr('aria-expanded', 'true');
    $dialog.find('[tabindex]').first().focus();
    e.preventDefault();
  });
  
  $modal_container = $PBJQ('.Mrphs-directUrl');
  
  $modal_container.each( function (index) {
	 var $invokerTabs = $PBJQ(this).find('[tabindex]'); 
	 $invokerTabs.first().on('keydown', function (e) {
		if( e.keyCode === 9 && e.shiftKey ) {
		  $invokerTabs.last().focus();
		  e.preventDefault();
		  return false;
		}
	 });
	 $invokerTabs.last().on('keydown', function (e) {
		if( e.keyCode === 9 && !e.shiftKey ) {
		  $invokerTabs.first().focus();
		  e.preventDefault();
		  return false;
		}
	 });
  });

  $modal_container.last().on('keypress', function (e) {
	  if( e.keyCode() === 9 ) {
		  console.log("keypress:: primero");
		  $modal_container.fist().focus();
		  e.preventDefault();
		  return false;
	  }
  });
  
  $PBJQ('.Mrphs-directUrl .dropDown_close').on('click keypress', function( e ){
	var $dialog = $PBJQ(this).parent();
	
	$dialog.toggleClass('active');
	$dialog.removeAttr('aria-expanded');
	$PBJQ('.Mrphs-toolTitleNav__link--directurl[rel="#'+$dialog.attr('id')+'"]').focus();
    e.preventDefault();
  });
});/**
 * For Skip Nav in Morpheus
 */

var setupSkipNav = function(){
  // function called from site.vm to enable skip links for all browsers
   $PBJQ('#skipNav a.Mrphs-skipNav__link').click(function(){
     var target = $PBJQ(this).attr('href');
    $PBJQ(target).attr('tabindex','-1').focus();
   });
};

$PBJQ( document ).ready(function() {
	
	var lastScrollTop = 0;

	$PBJQ(document).scroll(function(event){
	   var st = $PBJQ(this).scrollTop();
	   if (st > lastScrollTop && st > 90 ){
	   	   $PBJQ(".Mrphs-topHeader").addClass('moving');
	   	   $PBJQ(".Mrphs-siteHierarchy").addClass('moving');
	   	   $PBJQ(".Mrphs-toolsNav__title--current-site").addClass('moving');
	   	   $PBJQ(".Mrphs-skipNav__menu").addClass('moving');
	   	   $PBJQ(".Mrphs-sitesNav__menuitem--myworkspace").addClass('moving');
	   } else if( st > 90 || st == 0) {
	   	    $PBJQ(".Mrphs-topHeader").removeClass('moving');
	   	   	$PBJQ(".Mrphs-siteHierarchy").removeClass('moving');
	   	   	$PBJQ(".Mrphs-toolsNav__title--current-site").removeClass('moving');
	   	   	$PBJQ(".Mrphs-skipNav__menu").removeClass('moving');
	   	   	$PBJQ(".Mrphs-sitesNav__menuitem--myworkspace").removeClass('moving');
	   }
	   lastScrollTop = st;
	});

});/**
 * Sets up subnav on the sitenav
 */

var closeAllDropdownMenus = function() {
  $PBJQ('.Mrphs-sitesNav__menuitem').removeClass('dropdown-is-visible');
  $PBJQ('.Mrphs-sitesNav__menuitem').find('.is-visible').removeClass('is-visible');
  $PBJQ('.Mrphs-sitesNav__menuitem').find('.is-clicked').removeClass('is-clicked');

  $PBJQ('.sitenav-dropdown-overlay').remove();
};

var buildDropdownMenu = function(container, siteId, callback) {
  var navsubmenu = "<ul class=\"Mrphs-sitesNav__submenu\" role=\"menu\">";
  var maxToolsInt = parseInt($PBJQ('#linkNav').attr('data-max-tools-int'));
  var maxToolsText = $PBJQ('#linkNav').attr('data-max-tools-anchor');
  var goToSite = '<li class=\"Mrphs-sitesNav__submenuitem Mrphs-sitesNav__submenuitem__gotosite\"><a tabindex=\"-1\" role=\"menuitem\" href=\"' + portal.portalPath + '/site/' + siteId + '\" title=\"' + maxToolsText + '\"><span class=\"toolMenuIcon icon-sakai--see-all-tools\"></span>' + maxToolsText + '</a></li>';
  var siteURL = '/direct/site/' + siteId + '/pages.json';
  var currentSite = window.location.pathname.split('/').pop();

  $PBJQ.ajax({
    url: siteURL,
    dataType: "json",
    success: function(data){

      $PBJQ.each(data, function(i, item) {

    	// Ignore the tool if is not available
    	if (!item.tools || item.tools.length<=0) return;
    	
        // Check to see if this is the current tool in the site
        var isCurrent = "";
        if (currentSite == item.tools[0].id) {
          isCurrent = " is-current";
        }

        if (i <= maxToolsInt) {
          var li_template;

          if (item.toolpopup) {
            var link_attrs = ' role="menuitem" href="{{tool_url}}?sakai.popup=yes" title="{{item_title}}" onclick="window.open(\'{{item_toolpopupurl}}\');"';
            li_template = '<li class="Mrphs-sitesNav__submenuitem" >' +
              '<a tabindex="-1" class="Mrphs-sitesNav__submenuitem-link"' + link_attrs+'>' +
              '  <span class="Mrphs-sitesNav__submenuitem-icon"><span class="toolMenuIcon icon-sakai--{{icon}}"></span></span>' +
              '  <span class="Mrphs-sitesNav__submenuitem-title">{{item_title}}</span>' +
              '</a>' +
              '</li>';
          } else {
            var link_attrs = ' role="menuitem" href="{{tool_url}}" title="{{item_title}}"';

            li_template = '<li class="Mrphs-sitesNav__submenuitem{{is_current}}">' +
              '<a tabindex="-1" class="Mrphs-sitesNav__submenuitem-link"' + link_attrs+'>' +
              '  <span class="Mrphs-sitesNav__submenuitem-icon"><span class="toolMenuIcon icon-sakai--{{icon}}"></span></span>' +
              '  <span class="Mrphs-sitesNav__submenuitem-title">{{item_title}}</span>' +
              '</a>' +
              '</li>';
          }

          navsubmenu += (li_template
                         .replace(/{{tool_url}}/g, item.tools[0].url)
                         .replace(/{{item_title}}/g, item.title)
                         .replace(/{{item_toolpopupurl}}/g, item.toolpopupurl)
                         .replace(/{{icon}}/g, item.tools[0].toolId.replace(/\./gi, '-'))
                         .replace(/{{is_current}}/g, isCurrent));
        }
      });

      if((data.length - 1) > maxToolsInt) {
        navsubmenu += goToSite
      }

      navsubmenu += "</ul>"

      navsubmenu = $PBJQ(navsubmenu);

      container.append(navsubmenu);

      // Setup the arrow nav and focus on first element
      addArrowNavAndDisableTabNav(navsubmenu);

      callback(navsubmenu);
    },

    error: function(XMLHttpRequest, status, error){
      // Something happened getting the tool list.
    }
  });
};


var setupSiteNav = function(){

  $PBJQ("ul.Mrphs-sitesNav__menu").each(function(){

    // Add an escape key handler to slide the page menu up
    $PBJQ(this).keydown(function(e) {
      if (e.keyCode == 27) {
        closeAllDropdownMenus();
      }
    });
  });

  $PBJQ(document).on('keydown', '.Mrphs-sitesNav__menu > li.Mrphs-sitesNav__menuitem > a',
                    function (e) {
                      if (e.keyCode == 40) {
                        // downarrow
                        e.preventDefault();
                        // Trigger click on the drop <span>, passing true to set focus on
                        // the first tool in the dropdown.
                        var dropdown = $PBJQ(this).parent().find(".Mrphs-sitesNav__dropdown");

                        if (dropdown.data('clicked')) {
                          // If the user has already triggered a click, give the
                          // AJAX a chance to finish.
                        } else {
                          dropdown.data('clicked', true);
                          dropdown.trigger('click');
                        }
                      } else if (e.keyCode == 27) {
                        // escape
                        e.preventDefault();
                        closeAllDropdownMenus();
                      }

                    });

  // Must focus on first item for accessibility
  $PBJQ("ul.Mrphs-sitesNav__menu li .Mrphs-sitesNav__dropdown").click(function(e) {
    e.preventDefault()

    var jqObjDrop = $PBJQ(e.target);
    var container = jqObjDrop.parent('.Mrphs-sitesNav__menuitem');

    var dropdownWasShown = container.hasClass('dropdown-is-visible');

    // Hide any currently shown menus so we don't end up with multiple dropdowns shown
    closeAllDropdownMenus();

    if (dropdownWasShown) {
      // We've hidden the dropdown now, so all done.
      return;
    }

    var dropdownArrow = $PBJQ(this);

    var displayDropdown = function (navsubmenu) {
      // Mark the dropdown arrow and the menu itself as clicked
      dropdownArrow.addClass("is-clicked");
      container.addClass('dropdown-is-visible');

      // now display the menu
      navsubmenu.addClass('is-visible');
      // focus on first menu item per accessibility recommendations
      container.find('li a').first().focus();

      // Add an invisible overlay to allow clicks to close the dropdown
      var overlay = $PBJQ('<div class="sitenav-dropdown-overlay" />');

      overlay.on('click', function (e) {
        closeAllDropdownMenus();
      });

      $PBJQ('body').prepend(overlay);

      dropdownArrow.removeData('clicked');
    };

    if (!container.find('ul').length) {
      // We haven't yet built the dropdown menu for this item.  Do that now.
      buildDropdownMenu(container, jqObjDrop.attr('data-site-id'), displayDropdown);
    } else {
      displayDropdown(container.find('ul'));
    }

  }).hover(function(){
    $PBJQ(this).toggleClass("Mrphs-sitesNav__dropdown--hover"); //On hover over, add
  });
}

/*
  Callback is a function and is called after sliding up ul.
  This function is used by the Sites dialog and the main sites nav.
*/
function addArrowNavAndDisableTabNav(ul) {
  ul.find('li a').attr('tabindex','-1').keydown(function (e) {
    var obj = $PBJQ(e.target);
    if (e.keyCode == 40) {
      // Down arrow.  Move to the next item, or loop around if we're at the bottom.
      e.preventDefault();
      var next = obj.closest('li').next();

      if (next.length === 0 || next.find('a').length == 0) {
        // loop around
        next = ul.find('li').first();
      }

      ul.find('li a').attr('tabindex', '-1');
      next.find('a').focus().attr('tabindex', '0');

    } else if (e.keyCode == 38) {
      // Up arrow.  Move to the previous item, or loop around if we're at the top.
      e.preventDefault();
      var prev = obj.closest('li').prev();

      if (prev.length === 0) {
        // jump to the bottom
        prev = ul.find('a').closest('ul')
      }

      ul.find('li a').attr('tabindex', '-1');
      prev.find('a').focus().attr('tabindex', '0');

    } else if (e.keyCode == 9) { // Suck up the menu if tab is pressed
        closeAllDropdownMenus();
    }
  });
}
/**
* For toggling the Minimize and Maximize tools menu in Morpheus: Adds classes to the <body>
*/

portal = portal || {};

if (portal.toolsCollapsed === undefined) {
	portal.toolsCollapsed = false;
}

portal.updateToolsCollapsedPref = function (collapsed) {
	if (portal.user.id) {
		var url = '/direct/userPrefs/updateKey/' + portal.user.id + '/sakai:portal:sitenav?toolsCollapsed=' + collapsed;
		$PBJQ.ajax(url, {method: 'PUT', cache: false});
	}
};

portal.updateMaximisedToolsPref = function (maximised) {

	if (portal.user.id) {
		var url = '/direct/userPrefs/updateKey/' + portal.user.id + '/sakai:portal:sitenav?toolMaximised=' + maximised;
		$PBJQ.ajax(url, {method: 'PUT', cache: false});
	}
};

portal.maximiseTool = function () {

  document.getElementsByTagName("body").item(0).classList.add("tool-maximised");
  portal.updateMaximisedToolsPref(true);
  document.querySelectorAll("sakai-maximise-button").forEach(e => e.setMaximised());
  $PBJQ(document).off('keyup.usernav');
}

portal.minimiseTool = function () {

  document.getElementsByTagName("body").item(0).classList.remove("tool-maximised");
  portal.updateMaximisedToolsPref(false);
  document.querySelectorAll("sakai-maximise-button").forEach(e => e.setMinimised());
}

portal.toggleMinimizeNav = function () {

  $PBJQ("body").toggleClass("Mrphs-toolMenu-collapsed");

  // Remove any popout div for subsites.  Popout only displayed when portal.showSubsitesAsFlyout is set to true.
  $PBJQ('#subSites.floating').css({'display': 'none'});

  var el = $PBJQ("#toolsNav-toggle-li button");
  el.toggleClass('min max').parent().toggleClass('min max');

  if (portal.toolsCollapsed) {
    portal.updateToolsCollapsedPref(false);
    portal.toolsCollapsed = false;
    el.attr('aria-pressed', false);
  } else {
    portal.updateToolsCollapsedPref(true);
    portal.toolsCollapsed = true;
    el.attr('aria-pressed', true);
  }
};

const indicator = document.querySelector("#maximised-indicator a");
indicator && indicator.addEventListener("click", portal.minimiseTool);

$PBJQ("#toolsNav-toggle-li button").on("click", portal.toggleMinimizeNav);

$PBJQ(document).ready(function () {
//Shows or hides the subsites in a popout div. This isn't used unless
// portal.showSubsitesAsFlyout is set to true in sakai.properties.
    $PBJQ("#toggleSubsitesLink").click(function (e) {
        var subsitesLink = $PBJQ(this);
        if ($PBJQ('#subSites').css('display') == 'block') {
            $PBJQ('#subSites').hide();
            $PBJQ('#subSites').removeClass('floating');
        } else {
            var position = subsitesLink.position();
            var _top = ( -1 * ( $PBJQ('#toolMenu').height() - position.top ) );
            var subsitesPosition = ( MorpheusViewportHelper.isPhone() ) ? {
            	'display': 'block',
            	'top': 0,
            	'overflow' : 'hidden'
            }:{
            	'display': 'block',
            	'left': $PBJQ('#toolMenu').width() + 7 + 'px',	// width of arrow border
            	'top': _top + 'px'
            }
            $PBJQ('#subSites').css(subsitesPosition);
            $PBJQ('#subSites').addClass('floating');

            // focus on first subsite for accessibility recommendations
            $PBJQ('#subSites').find('li a').first().focus();

            if ($PBJQ("#toggleSubsitesLink").position().top < 240) {
                $PBJQ("#subSites.floating").addClass('ontop');
            }
        }
    });
});
function updatePresence(){

  $PBJQ.ajax({
    url: sakaiPresenceFragment,
    cache: false,
    dataType : 'text',
    success: function(frag){

      var $presenceIframe = $PBJQ("#presenceIframe");
      $presenceIframe.html(frag);

      var $presenceCount = $PBJQ("#presenceCount");

      if ($presenceIframe.is(':empty')) {
        $presenceCount.html(' ');
        $presenceCount.removeClass('present').addClass('empty');
        location.reload();
        return;
      }

      var userCount = $presenceIframe.find('.listUser').length;

      // No need to attrct attention you are alone

      if (userCount > 1) {
        $presenceCount.html(userCount + '');
        $presenceCount.removeClass('empty').addClass('present');
      }

      else if (userCount == 1) {
        $PBJQ("#presenceCount").html(userCount + '');
        $presenceCount.removeClass('present').addClass('empty');
      }

      else {
        $PBJQ("#presenceCount").html(' ');
        $presenceCount.removeClass('present').addClass('empty');
      }

      var chatUrl = $PBJQ('.nav-selected .icon-sakai-chat').attr('href');

      $PBJQ('#presenceIframe .presenceList div.inChat span').wrap('<a href="' + chatUrl + '"></a>')
      sakaiLastPresenceTimeOut = setTimeout('updatePresence()', 30000);
    },

    // If we get an error, wait 60 seconds before retry
    error: function(request, strError){
      sakaiLastPresenceTimeOut = setTimeout('updatePresence()', 60000);
    }
  });
}
/**
 * ESC handler to dismiss user nav
 */

function userNavEscHandler(e){

  if (e.keyCode === 27) { // esc keycode
    toggleUserNav(e);
  }
}

/**
 * Toggle user nav in header: 
 */

function toggleUserNav(event) {

  event.preventDefault();

  $PBJQ('.Mrphs-userNav__subnav').toggleClass('is-hidden');

  if (!$PBJQ('.Mrphs-userNav__subnav').hasClass('is-hidden')) {
    // Add an invisible overlay to allow clicks to close the dropdown

    var overlay = $PBJQ('<div class="user-dropdown-overlay" />');
    overlay.on('click', function (e) {toggleUserNav(e)});

    $PBJQ('body').prepend(overlay);

    // ESC key also closes it
    $PBJQ(document).on('keyup.usernav',userNavEscHandler);

  } else {
    $PBJQ('.user-dropdown-overlay').remove();
    $PBJQ(document).off('keyup',userNavEscHandler);    
  }
}

 // Logout Confirm
  $PBJQ('#loginLink1').click(function(e){
    if ($PBJQ(this).attr("data-warning") !== "" && !confirm($PBJQ(this).attr("data-warning"))){
	e.preventDefault();
    }
  });


$PBJQ(".js-toggle-user-nav a#loginUser > .Mrphs-userNav__drop-btn", "#loginLinks").on("click", toggleUserNav);
$PBJQ(".js-toggle-user-nav .Mrphs-userNav__drop-btn", "#loginLinks").on("click", toggleUserNav);

$PBJQ('.Mrphs-userNav__pic-changer').on("click", function (event) {

    var $profileLink = $PBJQ(this);

    if (!window.FileReader) {
        // we need FileReader support to load the image for croppie
        // when browser doesn't support it, then fallback to old upload method
        $PBJQ($profileLink.data("profileLink")).trigger("click");
        return true;
    }

    if (!$PBJQ.fn.modal) {
        // we need Bootstrap
        // when not loaded fallback to the old upload method
        $PBJQ($profileLink.data("profileLink")).trigger("click");
        return true;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    function resetProfileImage() {

        $modal.find(".modal-body .alert").hide();

        $PBJQ.ajax("/direct/profile-image/remove", {
            data: {
                sakai_csrf_token: sakai_csrf_token
            },
            type: 'POST',
            dataType: 'json',
            success: function (data, textStatus, jqXHR) {

                if (data.status == "SUCCESS") {
                    refreshProfileImageTagsAndHideDialog();
                    $PBJQ('#cropToolbar').hide();
                } else {
                    $PBJQ('#remove-error').show();
                }
            }
        });
    }

    function initCropWidget() {

        $cropWidget.find("> img").cropper({
            aspectRatio: 1 / 1,
            checkCrossOrigin: false,
            guides: true,
            minContainerWidth: 300,
            minContainerHeight: 300,
            autoCropArea: 1,
            viewMode: 1,
            dragMode: 'move'
        });
    }

    function initCropWidgetToolBar() {

        var $toolbar = $PBJQ('#cropToolbar').show();

        if (!portal.pictureToolbarSetup) {
            $PBJQ('.profile-image-zoom-in', $toolbar).on('click', function() {
                $cropWidget.find('> img').cropper('zoom', 0.1);
            });
            $PBJQ('.profile-image-zoom-out', $toolbar).on('click', function() {
                $cropWidget.find('> img').cropper('zoom', -0.1);
            });
            $PBJQ('.profile-image-pan-up', $toolbar).on('click', function() {
                $cropWidget.find('> img').cropper('move', 0, -10);
            });
            $PBJQ('.profile-image-pan-down', $toolbar).on('click', function() {
                $cropWidget.find('> img').cropper('move', 0, 10);
            });
            $PBJQ('.profile-image-pan-left', $toolbar).on('click', function() {
                $cropWidget.find('> img').cropper('move', 10, 0);
            });
            $PBJQ('.profile-image-pan-right', $toolbar).on('click', function() {
                $cropWidget.find('> img').cropper('move', -10, 0);
            });
            $PBJQ('.profile-image-rotate', $toolbar).on('click', function() {
                $cropWidget.find('> img').cropper('clear');
                $cropWidget.find('> img').cropper('rotate', 90);
                $cropWidget.find('> img').cropper('crop');
            });
            portal.pictureToolbarSetup = true;
        }
    }

    function setCropWidgetURL(url) {

        $cropWidget.show();
        $cropWidget.find("> img").cropper('clear');
        $cropWidget.find("> img").cropper('replace', url);
        $save.removeProp("disabled");

        initCropWidgetToolBar();
    }

    function loadExistingProfileImage() {

        $PBJQ.getJSON("/direct/profile-image/details?_=" + new Date().getTime(), function (json) {

            if (json.status == "SUCCESS") {
                if (!json.isDefault) {
                    setCropWidgetURL(json.url + "?_=" + new Date().getTime());

                    $PBJQ('.remove-profile-image').on("click", function () {
                        resetProfileImage();
                    });
                }
            }
            sakai_csrf_token = json.csrf_token;
        });
    };

    function getCropWidgetResultAsPromise() {

        return new Promise(function(resolve) {
            resolve($cropWidget.find("> img").cropper('getCroppedCanvas', {width: 200, height: 200}).toDataURL());
        });
    }

    function refreshProfileImageTagsAndHideDialog() {

        var picLink = $PBJQ('#loginUser > .Mrphs-userNav__submenuitem--profilepicture');
        var parent = picLink.parent();
        picLink.detach();
        var d = new Date();
        var style = 'background-image: url(/direct/profile/' + portal.user.id + '/image/thumb?' + d.getTime() + ')';
        picLink.attr('style', style);
        parent.prepend(picLink);

        picLink = $PBJQ('.Mrphs-userNav__submenuitem--profilelink > .Mrphs-userNav__submenuitem--profilepicture');
        parent = picLink.parent();
        picLink.detach();
        picLink.attr('style', style);
        parent.prepend(picLink);

        $PBJQ('#profileImageUpload').modal('hide');
    }

    function uploadProfileImage(imageByteSrc) {

        $modal.find(".modal-body .alert").hide();

        $PBJQ.ajax("/direct/profile-image/upload", {
            data: {
                sakai_csrf_token: sakai_csrf_token,
                base64: imageByteSrc
            },
            type: 'POST',
            dataType: 'json',
            success: function(data, textStatus, jqXHR) {

                if (data.status == "SUCCESS") {
                    refreshProfileImageTagsAndHideDialog();
                } else {
                    $PBJQ('#upload-error').show();
                }
            }
        });
    }

    // show popup!
    var $modal = $PBJQ('#profileImageUpload');
    var modalVisible = false;
    $modal.on("shown.bs.modal", function() {
        loadExistingProfileImage();
    });
    $modal.modal({
        width: 320
    });

    $PBJQ('#remove-error').hide();
    $PBJQ('#upload-error').hide();

    var $save = $modal.find("#save");

    var $fileUpload = $PBJQ('#file');

    var $cropWidget = $PBJQ('#cropme').hide();

    initCropWidget();

    $fileUpload.on("change", function () {

        var $this = $PBJQ(this);
        if (this.files && this.files[0]) {
            var reader = new FileReader();
            reader.onload = function (e) {
                setCropWidgetURL(e.target.result);
            };

            reader.readAsDataURL(this.files[0]);
        } else {
            throw "Browser does not support FileReader";
        }
    });

    $save.on('click', function (ev) {

        getCropWidgetResultAsPromise().then(function (src) {
            uploadProfileImage(src.replace(/^data:image\/(png|jpg);base64,/, ''));
        });
    });

    return false;
});

var header = $PBJQ(".Mrphs-topHeader");
var currentHeaderWidth = -1;

$PBJQ(document).ready( function(){

  $PBJQ(header).data("sticked",false);

  if( $PBJQ('.Mrphs-hierarchy--parent-sites').length > 0 && $PBJQ(window).width() <= 800 ){
    $PBJQ('#content').css( 'margin-top', ( parseInt( $PBJQ('#content').css('margin-top').replace('px', '') ) +  $PBJQ('.Mrphs-hierarchy--parent-sites').outerHeight(true) ) + 'px' );
  }
 
  $PBJQ(window).resize(function() {
	  currentHeaderWidth = $PBJQ(".Mrphs-mainHeader").width();
  });
 
  $PBJQ(window).scroll(function(){
		var size = 0;
		var stick = (($PBJQ(document).height() - $PBJQ(window).height()) > $PBJQ(header).height()) === true;
		if($PBJQ(window).scrollTop() > 0) {
			if($PBJQ(header).data("sticked") === false && stick === true) {
				$PBJQ(header).data("sticked",true);
				$PBJQ(".Mrphs-mainHeader").addClass("is-fixed");
		  }
		} else {
		  $PBJQ(".Mrphs-mainHeader").removeClass("is-fixed");
		  $PBJQ(header).data("sticked",false);
		}
  });
  
  currentHeaderWidth = $PBJQ(".Mrphs-mainHeader").width();

	$PBJQ('.Mrphs-headerLogo').on('click', function() {
		// scroll to top on banner click/touch
		document.body.scrollTop = 0;
		document.body.scrollLeft = 0;
		$PBJQ(window).trigger('scroll');
	});

  /////////////////////////////////////////////////
  // Add become user to body as a class
  ////////////////////////////////////////////////
  if (portal && portal.user && portal.user.impersonatorDisplayId) {
    $PBJQ("body").addClass("Mrphs-become-user-enabled");
  }
});
/**
 * Miscellaneous Utils
 */

function f_scrollTop(){
    return f_filterResults(window.pageYOffset ? window.pageYOffset : 0, document.documentElement ? document.documentElement.scrollTop : 0, document.body ? document.body.scrollTop : 0);
}

function f_filterResults(n_win, n_docel, n_body){
    var n_result = n_win ? n_win : 0;
    if (n_docel && (!n_result || (n_result > n_docel))) 
        n_result = n_docel;
    return n_body && (!n_result || (n_result > n_body)) ? n_body : n_result;
}

$PBJQ(document).ready(function(){
	$PBJQ('input, textarea', '#content').each( function(){
		if( $PBJQ(this).prop('disabled') ){
			$PBJQ(this).parent('label').addClass('disabled');
		}
	});
	
// SAK-29494: Escape key maps to keycode `27`
	$PBJQ(document).keyup(function(e) {
		if (e.keyCode == 27) {
			
			//Close More Sites
			if (!$PBJQ('#selectSiteModal').hasClass('outscreen') ){
				$PBJQ('#otherSitesMenu .otherSitesMenuClose').trigger('click');
			}
			
			//Close DirectUrl dialogs
			$PBJQ('.Mrphs-directUrl__dropDown').each(function(){
				if($PBJQ(this).hasClass('active')){
					$PBJQ(this).find('.dropDown_close').trigger('click');
				}
			});
			
			//Close Icon Selector in customization of Web Contents
			$PBJQ('.fip-icon-up-dir').trigger('click');				
			
			//Close All sites dialog in Resources
			$PBJQ('.navigatePanelControls .close').trigger('click');
		}
	});
});

// Viewport Helpers - used to better determine the current breakpoint
var MorpheusViewportHelper = {
  isPhone: function() {
    return $PBJQ('#Mrphs-viewport-helpers .phone').is(':visible');
  },

  isTablet: function() {
    return $PBJQ('#Mrphs-viewport-helpers .tablet').is(':visible');
  },


  isDesktop: function() {
    return $PBJQ('#Mrphs-viewport-helpers .desktop').is(':visible');
  },

  isNonPhone: function() {
    return (this.isDesktop() || this.isTablet()) && !this.isPhone();
  },
};/* XLogin over portal body */

$PBJQ(document).ready(function(){

  if( $PBJQ('#loginLink2').length == 1 ){

    $PBJQ('#loginLink2').click( function( e ){

      $PBJQ('body').append('<div id="Mrphs-xlogin-container" />');
      $PBJQ('#Mrphs-xlogin-container').load('/portal/xlogin #Mrphs-xlogin',function(){
        $PBJQ('#Mrphs-xlogin-container').addClass('loaded');
        $PBJQ('#Mrphs-xlogin').addClass('loadedByAjax');
        $PBJQ('#eid').focus();
      });
      $PBJQ('.Mrphs-portalWrapper').addClass('blurry');

      $PBJQ('body').append('<div id="loginPortalMask" />');
      $PBJQ('#loginPortalMask').bgiframe();
      
      $PBJQ('#loginPortalMask').click(function(){
        $PBJQ('#loginPortalMask').remove();
        $PBJQ('#Mrphs-xlogin-container').remove();
        $PBJQ('.Mrphs-portalWrapper').removeClass('blurry');
      });

      e.preventDefault();

    });
  }

});