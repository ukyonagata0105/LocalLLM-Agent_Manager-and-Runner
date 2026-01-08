# M08: Browser Automation (OpenHands)

> **モジュールID**: M08  
> **Tier**: 3 (Advanced - 本システム独自)  
> **依存**: M01 (OpenHands)  
> **被依存**: M04

---

## 1. 概要

OpenHands に組み込まれているブラウザ操作機能（BrowsingAgent / Playwright integration）を利用します。
本システム側では、ブラウザセッションの開始・停止指示、および操作ログ（スクリーンショット、操作履歴）の保存と再生を担当します。

---

## 2. 機能要件

### 2.1 ブラウザ操作 (OpenHandsDelegate)
- **Navigation**: 指定URLへの遷移
- **Interaction**: クリック、入力、スクロール
- **Extraction**: ページ情報の抽出（HTML/Text）
- **Screenshot**: 現在の状態のキャプチャ

### 2.2 セッション管理 (Manager Layer)
- **Cookie/Storage Persistence**: OpenHandsのセッション情報をローカルDB(M10)にバックアップし、次回のセッションで復元可能にする。
- **Live Preview**: OpenHandsから送信されるスクリーンショットストリームを `M21 Dashboard` に表示。

---

## 3. API インターフェース

### 3.1 Command (To OpenHands)

```typescript
interface BrowseCommand {
  action: 'goto' | 'click' | 'type' | 'scroll';
  selector?: string;
  value?: string;
  url?: string;
}
```

### 3.2 Event (From OpenHands)

```typescript
interface BrowserEvent {
  type: 'screenshot' | 'console' | 'network';
  data: string; // Base64 image or log text
  timestamp: number;
}
```

---

## 4. 制限事項

- **Stealth**: OpenHandsの実装に依存します。高度なBot対策回避が必要な場合は、OpenHands側の設定やプラグインで対応する必要があります。
- **Download**: ファイルダウンロードはOpenHandsのSandbox内に保存されます。本システムで利用するには `M15` 経由でファイルを取り出す必要があります。

---

*バージョン: 2.0 (OpenHands Integrated)*
*最終更新: 2026-01-05*
