export interface MarketplaceTemplate {
  id: string;
  name: string;
  description?: string;
  isPremium: boolean;
  price?: number;
  previewHtml: string;
  renderDimensions: {
    width: string;
    height: string;
    scale?: number;
  };
}
