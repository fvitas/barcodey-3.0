import UIKit
import Capacitor
import CapawesomeCapacitorAppShortcuts

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)

        if let shortcutItem = connectionOptions.shortcutItem {
            // deferred so the bridge has registered the plugin's notification observer
            DispatchQueue.main.async { self.postShortcut(shortcutItem) }
        }
    }

    func windowScene(_ windowScene: UIWindowScene, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        postShortcut(shortcutItem)
        completionHandler(true)
    }

    private func postShortcut(_ shortcutItem: UIApplicationShortcutItem) {
        NotificationCenter.default.post(
            name: NSNotification.Name(AppShortcutsPlugin.notificationName),
            object: nil,
            userInfo: [AppShortcutsPlugin.userInfoShortcutItemKey: shortcutItem]
        )
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
