export interface Location {
  id: string;
  name_ar: string;
  name_en: string;
}

export interface City extends Location {
  governorate_id: string;
}

export interface Area extends Location {
  city_id: string;
}
