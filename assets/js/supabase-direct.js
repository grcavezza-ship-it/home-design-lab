/**
 * Supabase Direct Loader - Bypassa i CDN usando fetch API diretta
 * Soluzione alternativa quando tutti i CDN falliscono
 */

(function() {
    'use strict';
    
    // URL diretti per Supabase JS
    const directSources = [
        'https://amhqqszzxmrphisxlsnj.supabase.co/rest/v1/',
        'https://amhqqszzxmrphisxlsnj.supabase.co/auth/v1/',
        'https://amhqqszzxmrphisxlsnj.supabase.co/storage/v1/'
    ];
    
    const supabaseUrl = 'https://amhqqszzxmrphisxlsnj.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHFxc3p6eG1ycGhpc3hsc25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDc1MjQsImV4cCI6MjA5MTQ4MzUyNH0.VubabSM4x4VrGF66a7lLVSDloUiVpdU_-Sofg5eYo4I';
    
    // Implementazione diretta di Supabase client
    function createDirectSupabaseClient(url, key) {
        console.log('Creating direct Supabase client');
        
        const client = {
            supabaseUrl: url,
            supabaseKey: key,
            
            // Auth implementation
            auth: {
                signUp: async function(data) {
                    console.log('Direct signUp:', data);
                    
                    try {
                        const response = await fetch(`${url}/auth/v1/signup`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': key,
                                'Authorization': `Bearer ${key}`
                            },
                            body: JSON.stringify(data)
                        });
                        
                        const result = await response.json();
                        
                        if (response.ok) {
                            return { data: result, error: null };
                        } else {
                            return { data: null, error: result };
                        }
                    } catch (error) {
                        console.error('Direct signUp error:', error);
                        return { data: null, error: { message: error.message } };
                    }
                },
                
                signIn: async function(data) {
                    console.log('Direct signIn:', data);
                    
                    try {
                        const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': key,
                                'Authorization': `Bearer ${key}`
                            },
                            body: JSON.stringify(data)
                        });
                        
                        const result = await response.json();
                        
                        if (response.ok) {
                            return { data: result, error: null };
                        } else {
                            return { data: null, error: result };
                        }
                    } catch (error) {
                        console.error('Direct signIn error:', error);
                        return { data: null, error: { message: error.message } };
                    }
                },
                
                signOut: async function() {
                    console.log('Direct signOut');
                    
                    try {
                        const response = await fetch(`${url}/auth/v1/logout`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': key,
                                'Authorization': `Bearer ${key}`
                            }
                        });
                        
                        const result = await response.json();
                        
                        if (response.ok) {
                            return { data: result, error: null };
                        } else {
                            return { data: null, error: result };
                        }
                    } catch (error) {
                        console.error('Direct signOut error:', error);
                        return { data: null, error: { message: error.message } };
                    }
                },
                
                onAuthStateChange: function(callback) {
                    console.log('Direct onAuthStateChange');
                    // Implementazione base
                    return {
                        data: { subscription: { id: 'direct-subscription' } }
                    };
                }
            },
            
            // Database implementation
            from: function(table) {
                console.log('Direct from:', table);
                
                return {
                    select: function(columns = '*') {
                        console.log('Direct select:', columns);
                        return this;
                    },
                    
                    eq: function(column, value) {
                        console.log('Direct eq:', column, value);
                        this._eqColumn = column;
                        this._eqValue = value;
                        return this;
                    },
                    
                    order: function(column, options) {
                        console.log('Direct order:', column, options);
                        this._orderColumn = column;
                        this._orderOptions = options;
                        return this;
                    },
                    
                    limit: function(count) {
                        console.log('Direct limit:', count);
                        this._limit = count;
                        return this;
                    },
                    
                    single: function() {
                        console.log('Direct single');
                        this._single = true;
                        return this._execute();
                    },
                    
                    maybeSingle: function() {
                        console.log('Direct maybeSingle');
                        this._maybeSingle = true;
                        return this._execute();
                    },
                    
                    _execute: async function() {
                        console.log('Direct _execute');
                        
                        try {
                            // Costruisci URL con parametri
                            let url = `${client.supabaseUrl}/rest/v1/${table}`;
                            const params = new URLSearchParams();
                            
                            if (this._eqColumn && this._eqValue) {
                                params.append(this._eqColumn, `eq.${this._eqValue}`);
                            }
                            
                            if (this._orderColumn) {
                                const order = this._orderOptions?.ascending === false ? 'desc' : 'asc';
                                params.append('order', `${this._orderColumn}.${order}`);
                            }
                            
                            if (this._limit) {
                                params.append('limit', this._limit.toString());
                            }
                            
                            if (params.toString()) {
                                url += '?' + params.toString();
                            }
                            
                            const response = await fetch(url, {
                                method: 'GET',
                                headers: {
                                    'apikey': client.supabaseKey,
                                    'Authorization': `Bearer ${client.supabaseKey}`,
                                    'Content-Type': 'application/json'
                                }
                            });
                            
                            const result = await response.json();
                            
                            if (response.ok) {
                                if (this._single && result.length > 0) {
                                    return { data: result[0], error: null };
                                } else if (this._maybeSingle) {
                                    return { data: result.length > 0 ? result[0] : null, error: null };
                                } else {
                                    return { data: result, error: null };
                                }
                            } else {
                                return { data: null, error: result };
                            }
                        } catch (error) {
                            console.error('Direct query error:', error);
                            return { data: null, error: { message: error.message } };
                        }
                    },
                    
                    insert: function(data) {
                        console.log('Direct insert:', data);
                        
                        return {
                            select: function() {
                                return this._executeInsert(data);
                            },
                            
                            _executeInsert: async function(insertData) {
                                try {
                                    const response = await fetch(`${client.supabaseUrl}/rest/v1/${table}`, {
                                        method: 'POST',
                                        headers: {
                                            'apikey': client.supabaseKey,
                                            'Authorization': `Bearer ${client.supabaseKey}`,
                                            'Content-Type': 'application/json',
                                            'Prefer': 'return=representation'
                                        },
                                        body: JSON.stringify(insertData)
                                    });
                                    
                                    const result = await response.json();
                                    
                                    if (response.ok) {
                                        return { data: result, error: null };
                                    } else {
                                        return { data: null, error: result };
                                    }
                                } catch (error) {
                                    console.error('Direct insert error:', error);
                                    return { data: null, error: { message: error.message } };
                                }
                            }
                        };
                    },
                    
                    update: function(data) {
                        console.log('Direct update:', data);
                        
                        return {
                            eq: function(column, value) {
                                this._eqColumn = column;
                                this._eqValue = value;
                                return this;
                            },
                            
                            then: function(callback) {
                                return this._executeUpdate().then(callback);
                            },
                            
                            _executeUpdate: async function() {
                                try {
                                    let url = `${client.supabaseUrl}/rest/v1/${table}`;
                                    const params = new URLSearchParams();
                                    
                                    if (this._eqColumn && this._eqValue) {
                                        params.append(this._eqColumn, `eq.${this._eqValue}`);
                                    }
                                    
                                    if (params.toString()) {
                                        url += '?' + params.toString();
                                    }
                                    
                                    const response = await fetch(url, {
                                        method: 'PATCH',
                                        headers: {
                                            'apikey': client.supabaseKey,
                                            'Authorization': `Bearer ${client.supabaseKey}`,
                                            'Content-Type': 'application/json',
                                            'Prefer': 'return=representation'
                                        },
                                        body: JSON.stringify(data)
                                    });
                                    
                                    const result = await response.json();
                                    
                                    if (response.ok) {
                                        return { data: result, error: null };
                                    } else {
                                        return { data: null, error: result };
                                    }
                                } catch (error) {
                                    console.error('Direct update error:', error);
                                    return { data: null, error: { message: error.message } };
                                }
                            }
                        };
                    },
                    
                    delete: function() {
                        console.log('Direct delete');
                        
                        return {
                            eq: function(column, value) {
                                this._eqColumn = column;
                                this._eqValue = value;
                                return this;
                            },
                            
                            _executeDelete: async function() {
                                try {
                                    let url = `${client.supabaseUrl}/rest/v1/${table}`;
                                    const params = new URLSearchParams();
                                    
                                    if (this._eqColumn && this._eqValue) {
                                        params.append(this._eqColumn, `eq.${this._eqValue}`);
                                    }
                                    
                                    if (params.toString()) {
                                        url += '?' + params.toString();
                                    }
                                    
                                    const response = await fetch(url, {
                                        method: 'DELETE',
                                        headers: {
                                            'apikey': client.supabaseKey,
                                            'Authorization': `Bearer ${client.supabaseKey}`,
                                            'Content-Type': 'application/json'
                                        }
                                    });
                                    
                                    const result = await response.json();
                                    
                                    if (response.ok) {
                                        return { data: result, error: null };
                                    } else {
                                        return { data: null, error: result };
                                    }
                                } catch (error) {
                                    console.error('Direct delete error:', error);
                                    return { data: null, error: { message: error.message } };
                                }
                            }
                        };
                    }
                };
            },
            
            // Storage implementation
            storage: {
                from: function(bucket) {
                    console.log('Direct storage from:', bucket);
                    
                    return {
                        upload: function(path, file, options) {
                            console.log('Direct storage upload:', path);
                            
                            return {
                                _executeUpload: async function() {
                                    try {
                                        const formData = new FormData();
                                        formData.append('file', file);
                                        
                                        const response = await fetch(`${client.supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
                                            method: 'POST',
                                            headers: {
                                                'apikey': client.supabaseKey,
                                                'Authorization': `Bearer ${client.supabaseKey}`
                                            },
                                            body: formData
                                        });
                                        
                                        const result = await response.json();
                                        
                                        if (response.ok) {
                                            return { data: result, error: null };
                                        } else {
                                            return { data: null, error: result };
                                        }
                                    } catch (error) {
                                        console.error('Direct storage upload error:', error);
                                        return { data: null, error: { message: error.message } };
                                    }
                                }
                            };
                        },
                        
                        getPublicUrl: function(path) {
                            console.log('Direct storage getPublicUrl:', path);
                            return `${client.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
                        }
                    };
                }
            }
        };
        
        return client;
    }
    
    // Esponi la funzione createClient globale
    window.createClient = createDirectSupabaseClient;
    window.SupabaseClient = createDirectSupabaseClient;
    
    // Funzione per verificare se stiamo usando il client diretto
    window.isUsingDirectClient = function() {
        return true;
    };
    
    console.log('Direct Supabase client loaded successfully');
    
})();
