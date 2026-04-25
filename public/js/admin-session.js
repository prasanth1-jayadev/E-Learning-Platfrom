/**
 * Admin Session Management Script
 * Handles browser back button and session validation
 */

(function() {
    'use strict';

    // Check if we're on an admin page
    const isAdminPage = window.location.pathname.startsWith('/admin/') && 
                       !window.location.pathname.includes('/login');
    
    const isLoginPage = window.location.pathname.includes('/admin/login');

    // Session validation function
    async function validateSession() {
        try {
            const response = await fetch('/admin/dashboard', {
                method: 'HEAD',
                credentials: 'same-origin'
            });
            
            return response.ok;
        } catch (error) {
            console.error('Session validation error:', error);
            return false;
        }
    }

    // Handle browser back button for admin pages
    if (isAdminPage) {
        // Prevent caching
        window.addEventListener('pageshow', function(event) {
            if (event.persisted) {
                // Page was loaded from cache, validate session
                validateSession().then(isValid => {
                    if (!isValid) {
                        window.location.replace('/admin/login');
                    }
                });
            }
        });

        // Handle browser back button
        window.addEventListener('popstate', function(event) {
            // Validate session when user navigates back
            validateSession().then(isValid => {
                if (!isValid) {
                    window.location.replace('/admin/login');
                }
            });
        });

        // Periodic session check (every 5 minutes)
        setInterval(async function() {
            const isValid = await validateSession();
            if (!isValid) {
                showToast('Your session has expired. Please login again.', 'error');
                setTimeout(() => {
                    window.location.replace('/admin/login');
                }, 2000);
            }
        }, 5 * 60 * 1000); // 5 minutes
    }   

    // Handle login page caching
    if (isLoginPage) {
        // Prevent caching of login page
        window.addEventListener('pageshow', function(event) {
            if (event.persisted) {
                // Reload the page if it was loaded from cache
                window.location.reload();
            }
        });

        // Clear browser history to prevent back button issues
        if (window.history.replaceState) {
            window.history.replaceState(null, null, window.location.href);
        }
    }

    // Handle logout
    window.adminLogout = function() {
        // Clear any cached data
        if ('caches' in window) {
            caches.keys().then(function(names) {
                names.forEach(function(name) {
                    caches.delete(name);
                });
            });
        }

        // Clear session storage
        sessionStorage.clear();
        
        // Redirect to logout endpoint
        window.location.replace('/admin/logout');
    };

    // Disable back button after logout
    if (document.referrer.includes('/admin/logout')) {
        window.history.forward();
    }

})();