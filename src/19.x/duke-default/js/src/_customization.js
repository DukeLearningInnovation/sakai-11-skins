(function ($) {
    console.log('duke-default/_customization.js loaded');
    
    ///////////////////////////////////////
    // GOOGLE ANALYTICS EVENT TRACKING
    ///////////////////////////////////////

    // click event to show directurl
    $(".Mrphs-toolTitleNav__link--directurl").on("click", function(e) {
        var label=$(this).siblings('.Mrphs-toolTitleNav__link--help-popup')[0].search;

        var gaEventData = {
            'hitType': 'event',
            'eventCategory': 'toolTitleNav',
            'eventAction': 'showDirectLink',
            'eventLabel': document.title + " : " + label.substring(6, label.length)
            };

        ga('send', gaEventData);
    });

    // click event to show help
    $(".Mrphs-toolTitleNav__link--help-popup").on("click", function(e) {
        var label=$(this)[0].search;

        var gaEventData = {
            'hitType': 'event',
            'eventCategory': 'toolTitleNav',
            'eventAction': 'goToHelp',
            'eventLabel': document.title + " : " + label.substring(6, label.length)
            };

        ga('send', gaEventData);
    });

    // click event to lessons print view
    $("#print-view").on("click", function(e) {
        var label=$(this)[0].search;

        var gaEventData = {
            'hitType': 'event',
            'eventCategory': 'toolTitleNav',
            'eventAction': 'lessionsPrintView',
            'eventLabel': document.title + " : " + label.substring(6, label.length)
            };

        ga('send', gaEventData);
    });

    // click event to lessons print all
    $("#print-all").on("click", function(e) {
        var label=$(this)[0].search;

        var gaEventData = {
            'hitType': 'event',
            'eventCategory': 'toolTitleNav',
            'eventAction': 'lessionsPrintAll',
            'eventLabel': document.title + " : " + label.substring(6, label.length)
            };

        ga('send', gaEventData);
    });

    // click event to lessons Index of Pages
    $("#show-pages").on("click", function(e) {
        var label=$(this)[0].search;

        var gaEventData = {
            'hitType': 'event',
            'eventCategory': 'toolTitleNav',
            'eventAction': 'lessionsIndexOfPages',
            'eventLabel': document.title + " : " + label.substring(6, label.length)
            };

        ga('send', gaEventData);
    });

    // click event to show tool dropdown in favorite sites
    $(".Mrphs-sitesNav__dropdown").on("click", function(e) {
        var label=$(this).siblings('a.link-container')[0].title;

        var gaEventData = {
            'hitType': 'event',
            'eventCategory': 'sitesNav',
            'eventAction': 'openToolDropdown',
            'eventLabel': document.title + " : " + label
            };

        ga('send', gaEventData);
    });

    // click event to refresh a tool
    $(".Mrphs-hierarchy--toolName").on("click", function(e) {

        var gaEventData = {
            'hitType': 'event',
            'eventCategory': 'hierarchy',
            'eventAction': 'refreshTool',
            'eventLabel': document.title
            };
            
        ga('send', gaEventData);
    });

    // click event to open sites waffle
    $(".view-all-sites-btn").on("click", function(e) {

        var gaEventData = {
            'hitType': 'event',
            'eventCategory': 'topHeader',
            'eventAction': 'openAllSitesDropdown',
            'eventLabel': document.title
            };
            
        ga('send', gaEventData);
    });

    // click event to collapse left sidebar
    $("#toolsNav-toggle-li").on("click", function(e) {
        var toggleState = 'undefined';
        
        if ($(this).hasClass('min')) {
            toggleState = 'collapseTools';
        } else if ($(this).hasClass('max')) {
            toggleState = 'maximizeTools';
        }

        var gaEventData = {
            'hitType': 'event',
            'eventCategory': 'toolMenu',
            'eventAction': toggleState,
            'eventLabel': document.title
            };

        ga('send', gaEventData);
    });

    // click event to show lessons print view
    $("#print-view").on("click", function(e) {

        var gaEventData = {
            'hitType': 'event',
            'eventCategory': 'toolTitleNav',
            'eventAction': 'showLessonsPrintView',
            'eventLabel': document.title
            };

        ga('send', gaEventData);
    });
    // click event to show lessons view all pages
    $("#show-pages").on("click", function(e) {

        var gaEventData = {
            'hitType': 'event',
            'eventCategory': 'toolTitleNav',
            'eventAction': 'showLessonsPages',
            'eventLabel': document.title
            };

        ga('send', gaEventData);
    });

    /////////////////////////////////////////////////
    // Add styles when impersonating another user
    ////////////////////////////////////////////////
    if ( $('#loginLink1').find('.Mrphs-login-Message').text().startsWith("Return") ){
        $('body').addClass('become-user');
    }

    var currentUrl = new URL(window.location.href);
    var serverClass = currentUrl.hostname.replace(/\./g, '-');
    $('body').addClass(serverClass);


    /////////////////////////////////////////////////
    // Add role to body as class
    ////////////////////////////////////////////////
    $('body').addClass(portal.user.siteRole.toLowerCase());


    /////////////////////////////////////////////////
    // Adjust hamburger menu when system alerts are active
    ////////////////////////////////////////////////

    var collapseToolsAdjustedTop = 0;

    // Call the observer to watch Mrphs-portalBody for
    // dynamic loading of the pasystem


    var watchForPasystemLoad = function(){
        // Select the node that will be observed for mutations
        var targetNode = document.getElementsByClassName('Mrphs-portalBody')[0];

        // Options for the observer (which mutations to observe)
        var config = { childList: true };

        // Callback function to execute when mutations are observed
        var portalMutationCallback = function(mutationsList, portalObserver) {

            for(var mutation of mutationsList) {

                if (mutation.type == 'childList') {

                    var mutationTarget = mutation.target.childNodes[0];

                    if (mutationTarget.className == 'pasystem-banner-alerts'){
                        
                        // Adjust hamburger for initial load of pasystem
                        collapseToolsAdjustedTop = document.getElementsByClassName('pasystem-banner-alerts')[0].clientHeight;
                        $('#toolsNav-toggle-li').css({'top': collapseToolsAdjustedTop});
                        
                        // Start observing events that change the pasystem
                        watchForPasystemChange();

                        // disconnect the portalBody observer, it is no longer needed
                        // once the pasystem is loaded into the DOM
                        portalObserver.disconnect();
                    }
                }
            }
        };

        // Create an observer instance linked to the callback function
        var portalObserver = new MutationObserver(portalMutationCallback);

        // Start observing the target node for configured mutations
        portalObserver.observe(targetNode, config);

    };

    var watchForPasystemChange = function(){

        // Select the node that will be observed for mutations
        var pasystemNode = document.getElementsByClassName('pasystem-banner-alerts')[0];
        var pasystemToggleNode = document.getElementsByClassName('pasystem-banner-alert-toggle')[0];

        // Options for the observer (which mutations to observe)
        var config = {
            childList: true,
            attributes: true,
            subtree:true,
            attributeOldValue: true
        };

        // Callback function to execute when mutations are observed
        var pasystemMutationCallback = function(mutationsList, pasystemObserver) {

            for(var mutation of mutationsList) {
   
                if (mutation.type == 'childList') {
                        collapseToolsAdjustedTop = pasystemNode.clientHeight;
                        $('#toolsNav-toggle-li').css({'top': collapseToolsAdjustedTop});
                }
               
                if (mutation.type == 'attributes' && mutation.target.className.includes('pasystem-banner-alert')) {
                        collapseToolsAdjustedTop = pasystemNode.clientHeight;
                        $('#toolsNav-toggle-li').css({'top': collapseToolsAdjustedTop});
                }
            }
        };
 
        // Create an observer instance linked to the callback function
        var pasystemObserver = new MutationObserver(pasystemMutationCallback);
        var pasystemToggleObserver = new MutationObserver(pasystemMutationCallback);
        
        // Start observing the target node for configured mutations
        pasystemObserver.observe(pasystemNode, config);
        
        // The toggleNode is in a separate part of the DOM
        // so it needs its own observer
        pasystemToggleObserver.observe(pasystemToggleNode, config);

    };
    watchForPasystemLoad();
    
    //Adjust the toolCollapse on window scroll
    $(window).scroll(function(){

        if($(window).scrollTop() > 0) {
            
            $('#toolsNav-toggle-li').css({'top': 0});
          
        } else {
            $('#toolsNav-toggle-li').css({'top': collapseToolsAdjustedTop});

        }
    });

    /////////////////////////////////////////////////
    // Make all MOTD cards the same height
    ////////////////////////////////////////////////
    if (document.title === 'Sakai : Home : Overview') {
        const setMOTDHeights = window.setTimeout(function(){
            let toolBodyMOTD = document.getElementsByClassName('Mrphs-toolBody--sakai-motd')[0].getElementsByTagName('iframe')[0].contentWindow;
            let motdCards = toolBodyMOTD.document.getElementsByClassName('textPanel');

            let motdArr = [].slice.call(motdCards);
            let tallestMOTD = Math.max.apply(Math, motdArr.map(function(card){return card.clientHeight}));

            for (let i = 0; i < motdArr.length; i++) {
                motdCards[i].style.height = `${tallestMOTD}px`;
                motdCards[i].getElementsByTagName('a')[0].style.cssText = 'bottom: 16px';
            }
        },1000);
    }

    ///////////////////////////////////////////////////
    // Removed for #150 Adjust lessons subpage breadcrumbs positioning
    ///////////////////////////////////////////////////
    // if (document.getElementsByClassName('Mrphs-sakai-lessonbuildertool')[0]){
    //     let toolNameWidth = document.getElementsByClassName('Mrphs-hierarchy-item Mrphs-hierarchy--toolName')[0].clientWidth;
        

    //     //get all children of portletbody preceeding #subpage-breadcrumb-div
    //     let portletBodyChildren = Array.from(document.getElementsByClassName('portletBody')[0].children);
        
    //     let subpageBreadcrumbIndex = portletBodyChildren.findIndex(function(i){
    //         return i.className === 'subpage-breadcrumb-div';
    //     });
        
    //     //add up all their heights
    //     let subpageBreadcrumbMargin = 99;
    //     for (let i = 0; i < subpageBreadcrumbIndex; i++) {
    //         subpageBreadcrumbMargin += portletBodyChildren[i].clientHeight;
    //     }
    //     //set new #subpage-breadcrumb-div margin
    //     //margin:-130px 0 calc(130px - #{$standard-spacing} - 21px - #{$standard-spacing});
    //     document.getElementById('subpage-breadcrumb-div').style.cssText = `margin:-${subpageBreadcrumbMargin}px 0 calc(${subpageBreadcrumbMargin}px - 53px) ${toolNameWidth}px`;
    // }

    ///////////////////////////////////////////////////
    // Adjust forums nex/prev topic positioning
    ///////////////////////////////////////////////////
    if ((document.querySelector('#msgForum .itemNav .button[title=" < Previous Topic"]') ||
        document.querySelector('#msgForum .itemNav .button[title=" Next Topic >"]') ) &&
        document.getElementsByClassName('topicBloc topicBlocLone specialLink') && 
        window.innerWidth > 1030) {
        let forumDescHeight = 16 + 33 + document.getElementsByClassName('topicBloc topicBlocLone specialLink')[0].clientHeight;
        let topicNav = document.querySelector('#msgForum .itemNav');
        topicNav.style.cssText = `top:${forumDescHeight}px`;
    }

    ///////////////////////////////////////////////////
    // #157 Inject skin modified date into footer 
    ///////////////////////////////////////////////////
    if ( document.getElementById('footer-links') !== 'null'){
        //the bin/uglify.sh script updates this on compile
        let buildTimeHtml = '<dt>Skin Version:</dt><dd>TIME</dd>';

        document.querySelector('#Mrphs-footer--details__panel dl').insertAdjacentHTML('beforeend',buildTimeHtml);
    }
}) ($PBJQ);

