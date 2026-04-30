

(function() {
    'use strict';

    const isAdminPage = window.location.pathname.startsWith('/admin/') && 
                       !window.location.pathname.includes('/login');
    
    const isLoginPage = window.location.pathname.includes('/admin/login');

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

    if (isAdminPage) {
        window.addEventListener('pageshow', function(event) {
            if (event.persisted) {
                validateSession().then(isValid => {
                    if (!isValid) {
                        window.location.replace('/admin/login');
                    }
                });
            }
        });

        window.addEventListener('popstate', function(event) {
            validateSession().then(isValid => {
                if (!isValid) {
                    window.location.replace('/admin/login');
                }
            });
        });

        setInterval(async function() {
            const isValid = await validateSession();
            if (!isValid) {
                showToast('Your session has expired. Please login again.', 'error');
                setTimeout(() => {
                    window.location.replace('/admin/login');
                }, 2000);
            }
        }, 5 * 60 * 1000); 
    }   

    if (isLoginPage) {
        window.addEventListener('pageshow', function(event) {
            if (event.persisted) {
              
                window.location.reload();
            }
        });

        if (window.history.replaceState) {
            window.history.replaceState(null, null, window.location.href);
        }
    }


    window.adminLogout = function() {
        // Clear browser cache
        if ('caches' in window) {
            caches.keys().then(function(names) {
                names.forEach(function(name) {
                    caches.delete(name);
                });
            });
        }

        // Clear session storage
        sessionStorage.clear();
        
        // Redirect to logout
        window.location.replace('/admin/logout');
    };

    if (document.referrer.includes('/admin/logout')) {
        window.history.forward();
    }

})();