import WidgetKit
import SwiftUI

@main
struct SproutWidgetBundle: WidgetBundle {
    var body: some Widget {
        SproutWidget()
        if #available(iOS 17.0, *) {
            SproutInteractiveWidget()
        }
        SproutWeeklyWidget()
    }
}
