import Capacitor
import UIKit

/// The app's web view (Main.storyboard). Registers the plugins that live in this app
/// rather than in a package.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(LiveActivityPlugin())
    }
}
