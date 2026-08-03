package com.seedce.android;

import android.annotation.SuppressLint;
import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.Toast;

public class MainActivity extends Activity {

    private WebView webView;
    private static final int FILE_CHOOSER_REQUEST = 1003;
    private static final int CAMERA_PERMISSION_REQUEST = 1004;

    private ValueCallback<Uri[]> filePathCallback;
    private PermissionRequest pendingPermissionRequest;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (!isCallerTrusted()) {
            finish();
            return;
        }
        if (isDebuggerConnected()) {
            finish();
            return;
        }

        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);

        FrameLayout root = new FrameLayout(this);
        webView = new WebView(this);
        webView.setFilterTouchesWhenObscured(true);
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSavePassword(false);
        settings.setSaveFormData(false);

        try {
            if (android.os.Build.VERSION.SDK_INT >= 33) {
                androidx.webkit.WebSettingsCompat.setAlgorithmicDarkeningAllowed(settings, false);
            }
            if (androidx.webkit.WebViewFeature.isFeatureSupported(androidx.webkit.WebViewFeature.FORCE_DARK)) {
                androidx.webkit.WebSettingsCompat.setForceDark(settings, androidx.webkit.WebSettingsCompat.FORCE_DARK_OFF);
            }
            if (androidx.webkit.WebViewFeature.isFeatureSupported(androidx.webkit.WebViewFeature.FORCE_DARK_STRATEGY)) {
                androidx.webkit.WebSettingsCompat.setForceDarkStrategy(settings, androidx.webkit.WebSettingsCompat.DARK_STRATEGY_WEB_THEME_DARKENING_ONLY);
            }
        } catch (Exception ignored) {
        }

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> handleWebViewPermissionRequest(request));
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                return handleFileChooser(callback, params);
            }
        });

        webView.loadUrl("file:///android_asset/www/index.html");
    }

    private void handleWebViewPermissionRequest(final PermissionRequest request) {
        String[] resources = request.getResources();
        boolean wantsCamera = false;
        for (String r : resources) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) {
                wantsCamera = true;
                break;
            }
        }
        if (!wantsCamera) {
            request.deny();
            return;
        }
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            request.grant(resources);
        } else {
            pendingPermissionRequest = request;
            requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_REQUEST && pendingPermissionRequest != null) {
            final PermissionRequest req = pendingPermissionRequest;
            pendingPermissionRequest = null;
            boolean granted = grantResults.length > 0
                    && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            runOnUiThread(() -> {
                if (granted) {
                    req.grant(req.getResources());
                } else {
                    req.deny();
                }
            });
        }
    }

    private boolean handleFileChooser(ValueCallback<Uri[]> callback, WebChromeClient.FileChooserParams params) {
        if (filePathCallback != null) {
            filePathCallback.onReceiveValue(null);
        }
        filePathCallback = callback;
        Intent intent = params.createIntent();
        try {
            startActivityForResult(intent, FILE_CHOOSER_REQUEST);
        } catch (Exception e) {
            filePathCallback = null;
            Toast.makeText(this, "无法打开文件选择器：" + e.getMessage(), Toast.LENGTH_LONG).show();
            return false;
        }
        return true;
    }

    @Override
    protected void onPause() {
        super.onPause();
        clearClipboard();
        if (webView != null) {
            webView.evaluateJavascript(
                "(function(){" +
                "  if(window._clearSensitiveData) window._clearSensitiveData();" +
                "  document.activeElement && document.activeElement.blur();" +
                "})();", null);
            webView.onPause();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (webView != null) {
            webView.stopLoading();
            webView.clearFormData();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST) {
            handleFileChooserResult(resultCode, data);
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    private void handleFileChooserResult(int resultCode, Intent data) {
        if (filePathCallback == null) return;
        Uri[] results = null;
        if (resultCode == Activity.RESULT_OK && data != null) {
            if (data.getData() != null) {
                results = new Uri[]{data.getData()};
            } else if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                results = new Uri[count];
                for (int i = 0; i < count; i++) {
                    results[i] = data.getClipData().getItemAt(i).getUri();
                }
            }
        }
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    @Override
    public boolean onKeyDown(int keyCode, android.view.KeyEvent event) {
        if (keyCode == android.view.KeyEvent.KEYCODE_BACK && webView != null && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    private boolean isCallerTrusted() {
        try {
            String callerPkg = getCallingPackage();
            if (callerPkg == null) {
                return true;
            }
            return getPackageName().equals(callerPkg);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isDebuggerConnected() {
        try {
            return android.os.Debug.isDebuggerConnected();
        } catch (Exception e) {
            return true;
        }
    }

    private void clearClipboard() {
        try {
            android.content.ClipboardManager cm = (android.content.ClipboardManager)
                    getSystemService(android.content.Context.CLIPBOARD_SERVICE);
            if (cm != null) {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                    cm.clearPrimaryClip();
                } else {
                    cm.setPrimaryClip(android.content.ClipData.newPlainText("", ""));
                }
            }
        } catch (Exception ignored) {
        }
    }

    @Override
    protected void onDestroy() {
        if (filePathCallback != null) {
            filePathCallback.onReceiveValue(null);
            filePathCallback = null;
        }
        pendingPermissionRequest = null;
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.stopLoading();
            webView.clearHistory();
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
