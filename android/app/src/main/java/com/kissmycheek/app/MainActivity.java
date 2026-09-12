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

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        checkAudioVideoPermissions();
        setupWebViewMediaSettings();
        setupModernBackHandler();
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
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
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
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.MODIFY_AUDIO_SETTINGS
                },
                PERM_REQUEST_CODE
            );
        }
    }

    @Override
    public void onBackPressed() {
        // Delegate to dispatcher
        getOnBackPressedDispatcher().onBackPressed();
    }
}
