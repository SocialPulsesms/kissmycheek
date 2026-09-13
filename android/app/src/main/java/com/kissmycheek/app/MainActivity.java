package com.kissmycheek.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int PERM_REQUEST_CODE = 200;
    private long lastBackPressTime = 0;
    private boolean isAppReady = false;
    private android.webkit.PermissionRequest pendingPermissionRequest = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        androidx.core.splashscreen.SplashScreen splashScreen = androidx.core.splashscreen.SplashScreen.installSplashScreen(this);
        // Keep the native luxury crown splash on screen until the web view has loaded its initial frame
        splashScreen.setKeepOnScreenCondition(() -> !isAppReady);

        super.onCreate(savedInstanceState);

        // Allow web view time to load its DOM while the crown emblem remains seamlessly visible
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            isAppReady = true;
        }, 1200);

        checkAudioVideoPermissions();
        setupWebViewMediaSettings();
        setupModernBackHandler();
    }

    @Override
    protected void load() {
        super.load();
        setupWebViewMediaSettings();
    }

    private void setupWebViewMediaSettings() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(() -> {
                try {
                    android.webkit.WebSettings settings = getBridge().getWebView().getSettings();
                    settings.setMediaPlaybackRequiresUserGesture(false);
                    settings.setJavaScriptEnabled(true);
                    settings.setDomStorageEnabled(true);
                    settings.setDatabaseEnabled(true);
                    settings.setAllowFileAccess(true);
                    settings.setAllowContentAccess(true);

                    // Ensure Android WebView WebChromeClient cleanly grants camera & mic for WebRTC
                    getBridge().getWebView().setWebChromeClient(new com.getcapacitor.BridgeWebChromeClient(getBridge()) {
                        @Override
                        public void onPermissionRequest(final android.webkit.PermissionRequest request) {
                            runOnUiThread(() -> {
                                try {
                                    boolean hasCamera = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
                                    boolean hasAudio = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;

                                    if (hasCamera || hasAudio) {
                                        // Immediately grant WebRTC hardware access to Webview
                                        request.grant(request.getResources());
                                    } else {
                                        pendingPermissionRequest = request;
                                        ActivityCompat.requestPermissions(
                                            MainActivity.this,
                                            new String[]{
                                                Manifest.permission.CAMERA,
                                                Manifest.permission.RECORD_AUDIO
                                            },
                                            PERM_REQUEST_CODE
                                        );
                                    }
                                } catch (Exception e) {
                                    e.printStackTrace();
                                    try {
                                        request.grant(request.getResources());
                                    } catch (Exception ignored) {}
                                }
                            });
                        }

                        @Override
                        public void onPermissionRequestCanceled(android.webkit.PermissionRequest request) {
                            if (pendingPermissionRequest == request) {
                                pendingPermissionRequest = null;
                            }
                            super.onPermissionRequestCanceled(request);
                        }
                    });

                    // Prevent any white flips / flashes when webview initializes
                    getBridge().getWebView().setBackgroundColor(android.graphics.Color.parseColor("#050507"));
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        setupWebViewMediaSettings();
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(android.graphics.Color.parseColor("#050507"));
            getBridge().getWebView().resumeTimers();
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().resumeTimers();
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().resumeTimers();
        }
    }

    private void setupModernBackHandler() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().evaluateJavascript(
                        "(function(){ try { if (typeof window !== 'undefined' && typeof window.kmcHandleAndroidBack === 'function') { return window.kmcHandleAndroidBack() === true ? 'HANDLED' : 'NOT_HANDLED'; } } catch(e){} return 'NO_FN'; })()",
                        result -> runOnUiThread(() -> {
                            if (result != null && (result.contains("HANDLED") || "\"HANDLED\"".equals(result))) {
                                // In-app navigation or modal close executed successfully!
                                return;
                            }

                            // Fallback to webView history if available
                            if (getBridge().getWebView().canGoBack()) {
                                getBridge().getWebView().goBack();
                                return;
                            }

                            // On root screen: require double tap within 2s to exit/minimize
                            long currentTime = System.currentTimeMillis();
                            if (currentTime - lastBackPressTime < 2000) {
                                moveTaskToBack(true);
                            } else {
                                lastBackPressTime = currentTime;
                                Toast.makeText(MainActivity.this, "Press back again to exit", Toast.LENGTH_SHORT).show();
                            }
                        })
                    );
                    return;
                }

                // If bridge or webview is not ready
                long currentTime = System.currentTimeMillis();
                if (currentTime - lastBackPressTime < 2000) {
                    moveTaskToBack(true);
                } else {
                    lastBackPressTime = currentTime;
                    Toast.makeText(MainActivity.this, "Press back again to exit", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private void checkAudioVideoPermissions() {
        boolean hasCamera = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        boolean hasAudio = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        
        if (!hasCamera || !hasAudio) {
            ActivityCompat.requestPermissions(
                this,
                new String[]{
                    Manifest.permission.CAMERA,
                    Manifest.permission.RECORD_AUDIO
                },
                PERM_REQUEST_CODE
            );
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERM_REQUEST_CODE && pendingPermissionRequest != null) {
            final android.webkit.PermissionRequest req = pendingPermissionRequest;
            pendingPermissionRequest = null;
            runOnUiThread(() -> {
                try {
                    boolean anyGranted = false;
                    if (grantResults != null && grantResults.length > 0) {
                        for (int res : grantResults) {
                            if (res == PackageManager.PERMISSION_GRANTED) {
                                anyGranted = true;
                                break;
                            }
                        }
                    }

                    boolean hasCamera = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
                    boolean hasAudio = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;

                    if (anyGranted || hasCamera || hasAudio) {
                        req.grant(req.getResources());
                    } else {
                        req.deny();
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                    try { req.grant(req.getResources()); } catch (Exception ignored) {}
                }
            });
        }
    }

    @Override
    public void onBackPressed() {
        // Delegate to dispatcher
        getOnBackPressedDispatcher().onBackPressed();
    }
}
