package site.blackfighters.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Explicitly disable remote web debugging for production security
        WebView.setWebContentsDebuggingEnabled(false);
    }
}
