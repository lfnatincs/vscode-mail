import * as vscode from 'vscode';
import * as path from 'path';
import {Message, NodeType} from '../sdk/imap';
import { createImapInstance, createSmtpInstance, getImapInstance, getSmtpInstance } from '../sdk/holder';
import { DISPLAY_KEY, MAIL_KEY } from '../strategy';
import ImapFace from '../sdk/imap';

export class Mail extends vscode.TreeItem {

    constructor(
        public readonly label: string,
        public readonly from: string,
        public readonly content: string,
        public readonly type: NodeType,
        public readonly config: any,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
    ) {
        super(label, collapsibleState);

        this.tooltip = this.label;
        this.description = '';
        this.command = { command: 'vsc-mail.openContent', title: 'open', arguments: [label, content] };
        // if (!abstract.read) {
        //     this.iconPath = new vscode.ThemeIcon('circle-outline');
        // }
    }

    iconPath = {
        light: path.join(__filename, '..', '..', 'images', 'mail.svg'),
        dark: path.join(__filename, '..', '..', 'images', 'mail.svg')
    };

    contextValue = 'mail';
}


export class MailProvider implements vscode.TreeDataProvider<Mail> {
    // private imap: any;
    private _onDidChangeTreeData: vscode.EventEmitter<Mail | undefined | void> = new vscode.EventEmitter<Mail | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<Mail | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {
        
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: Mail): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: Mail): Promise<Mail[]> {
        vscode.window.showInformationMessage('load tree from vsc-mail!');
        if (element) {
            switch (element.type) {
                case NodeType.Vendor:
                    createImapInstance(element.config);
                    createSmtpInstance(element.config);
                    let imapFace = getImapInstance(element.config[DISPLAY_KEY]);
                    let imap = await imapFace.connect();
                    let boxes = await imap.getBoxesAsync();
                    let boxNodes: Mail[] = [];
                    for (const key in boxes) {
                        boxNodes.push(new Mail(key, '', '' ,NodeType.Box, element.config, vscode.TreeItemCollapsibleState.Collapsed));
                    }
                    return Promise.resolve(boxNodes);
                case NodeType.Box:
                    let imapFace2 = getImapInstance(element.config[DISPLAY_KEY]);
                    let messages = await imapFace2.openMail(element.tooltip as string);
                    let mailNodes = messages.map((msg: Message) => {
                        return new Mail(msg.subject, msg.from, msg.content, NodeType.Mail, element.config, vscode.TreeItemCollapsibleState.None);
                    });
                    return Promise.resolve(mailNodes);
                default:
                    return Promise.resolve([]);
            }
        } else {
            let vendors: any = this.context.globalState.get(MAIL_KEY);
            if(vendors && Object.keys(vendors).length > 0){
                let vendorKeys = Object.keys(vendors);
                let nodes = vendorKeys.map((vendorKey) => {
                    return new Mail(vendorKey, '', '', NodeType.Vendor, vendors[vendorKey],vscode.TreeItemCollapsibleState.Collapsed)
                })
                return Promise.resolve(nodes);
            } else {
                return Promise.resolve([]);
            }
        }

    }
}

export async function reply(mail: Mail, html: string) {
    let smtp = getSmtpInstance(mail.config[DISPLAY_KEY]);
    await smtp.send(mail.from, 'Re ' + mail.tooltip, html);
}

export function openContent(subject: string, content: string) {
    const panel = vscode.window.createWebviewPanel(
        subject as string,
        subject as string,
        vscode.ViewColumn.One,
        {}
    );

    // 设置HTML内容
    panel.webview.html = content;
}