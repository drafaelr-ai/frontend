package uk.obraly.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final long EXIT_CONFIRM_WINDOW_MS = 2000L;

    private boolean exitConfirmArmed = false;
    private final Handler exitHandler = new Handler(Looper.getMainLooper());
    private final Runnable disarmExit = new Runnable() {
        @Override
        public void run() {
            exitConfirmArmed = false;
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = (getBridge() != null) ? getBridge().getWebView() : null;

                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                    return;
                }

                if (exitConfirmArmed) {
                    exitHandler.removeCallbacks(disarmExit);
                    exitConfirmArmed = false;
                    moveTaskToBack(true);
                    return;
                }

                exitConfirmArmed = true;
                Toast.makeText(MainActivity.this,
                        "Pressione voltar novamente para sair",
                        Toast.LENGTH_SHORT).show();
                exitHandler.postDelayed(disarmExit, EXIT_CONFIRM_WINDOW_MS);
            }
        });
    }

    @Override
    public void onDestroy() {
        exitHandler.removeCallbacks(disarmExit);
        super.onDestroy();
    }
}
