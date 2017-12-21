import {
    Event,
    EventEmitter,
    TreeDataProvider,
    TreeItem,
    TreeItemCollapsibleState,
    Uri,
    workspace
} from 'vscode'

import { Item } from './Item'
import { ItemsModel } from './ItemsModel'
import { getHost } from './../Utils'
import * as path from 'path'

/**
 * Produces a tree view of openHAB items
 * collected from REST API
 * 
 * Kuba Wolanin - Initial contribution
 */
export class ItemsExplorer implements TreeDataProvider<Item> {

    private _onDidChangeTreeData: EventEmitter<any> = new EventEmitter<any>()
    readonly onDidChangeTreeData: Event<any> = this._onDidChangeTreeData.event

    constructor() {
        this.openhabHost = getHost()
    }

    private openhabHost: string

    private model: ItemsModel

    refresh(): void {
        this._onDidChangeTreeData.fire()
    }

    public getTreeItem(item: Item): TreeItem {
        let treeItem = {
            label: item.name + (item.state ? ' (' + item.state + ')' : ''),
            collapsibleState: item.isGroup ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None,
            command: item.isGroup ? void 0 : {
                command: 'openhab.command.showInPaperUI',
                arguments: [item.name],
                title: 'Show in Paper UI'
            },
            contextValue: this.getViewItem(item),
            iconPath: {
                light: this.getTypeIcon('light', item.type),
                dark: this.getTypeIcon('dark', item.type)
            }
        };

        if (workspace.getConfiguration('openhab').customIcons && item.category !== 'none') {
            treeItem.iconPath = {
                light: this.getCustomIcon(item),
                dark: this.getCustomIcon(item)
            }
        }

        return treeItem;
    }

    /**
     * Used to determine a context value of the TreeItem
     * If viewItem is 'statelessItem' or 'statelessGroup',
     * "Copy State" context menu doesn't show up.
     * 
     * @param item Item
     */
    private getViewItem(item): string {
        let type = item.isGroup ? 'Group' : 'Item'
        return item.state ? type : 'stateless' + type
    }

    /**
     * Returns an absolute path to the Item's type icon
     * Note: VS Code doesn't allow to display icons from external source.
     * This is why `item.icon` property is not used there.
     * 
     * @param shade 'light' or 'dark' depending on the Color Theme
     * @param name icon's filename
     */
    private getTypeIcon(shade: string, name: string) {
        return path.join(__filename, '..', '..', '..', '..', 'resources', shade, name.toLowerCase() + '.svg')
    }

    private getCustomIcon(item: Item) {
        // only HTTPS works here... :/
        let icon = Uri.parse(this.openhabHost + item.icon)

        // HACK: Monkey patch Uri.toString to avoid the unwanted query string encoding
        const originalToStringFn = icon.toString;
        icon.toString = function(skipEncoding?: boolean | undefined) {
            return originalToStringFn.call(icon, true)
        }

        return icon
    }

    public getChildren(item?: Item): Item[] | Thenable<Item[]> {
        if (!item) {
            if (!this.model) {
                this.model = new ItemsModel(this.openhabHost)
            }

            return this.model.roots
        }

        return this.model.getChildren(item)
    }
}
