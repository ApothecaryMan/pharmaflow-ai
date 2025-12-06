import { AREAS as SPECIFIC_AREAS } from './areas';

// Egyptian Governorates and Cities Data
// This acts as a local library for location data

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

export const GOVERNORATES: Location[] = [
  { id: '1', name_ar: 'القاهرة', name_en: 'Cairo' },
  { id: '2', name_ar: 'الجيزة', name_en: 'Giza' },
  { id: '3', name_ar: 'الإسكندرية', name_en: 'Alexandria' },
  { id: '4', name_ar: 'الدقهلية', name_en: 'Dakahlia' },
  { id: '5', name_ar: 'البحر الأحمر', name_en: 'Red Sea' },
  { id: '6', name_ar: 'البحيرة', name_en: 'Beheira' },
  { id: '7', name_ar: 'الفيوم', name_en: 'Fayoum' },
  { id: '8', name_ar: 'الغربية', name_en: 'Gharbia' },
  { id: '9', name_ar: 'الإسماعيلية', name_en: 'Ismailia' },
  { id: '10', name_ar: 'المنوفية', name_en: 'Monufia' },
  { id: '11', name_ar: 'المنيا', name_en: 'Minya' },
  { id: '12', name_ar: 'القليوبية', name_en: 'Qalyubia' },
  { id: '13', name_ar: 'الوادي الجديد', name_en: 'New Valley' },
  { id: '14', name_ar: 'السويس', name_en: 'Suez' },
  { id: '15', name_ar: 'اسوان', name_en: 'Aswan' },
  { id: '16', name_ar: 'اسيوط', name_en: 'Assiut' },
  { id: '17', name_ar: 'بني سويف', name_en: 'Beni Suef' },
  { id: '18', name_ar: 'بورسعيد', name_en: 'Port Said' },
  { id: '19', name_ar: 'دمياط', name_en: 'Damietta' },
  { id: '20', name_ar: 'الشرقية', name_en: 'Sharkia' },
  { id: '21', name_ar: 'جنوب سيناء', name_en: 'South Sinai' },
  { id: '22', name_ar: 'كفر الشيخ', name_en: 'Kafr El Sheikh' },
  { id: '23', name_ar: 'مطروح', name_en: 'Matrouh' },
  { id: '24', name_ar: 'الأقصر', name_en: 'Luxor' },
  { id: '25', name_ar: 'قنا', name_en: 'Qena' },
  { id: '26', name_ar: 'شمال سيناء', name_en: 'North Sinai' },
  { id: '27', name_ar: 'سوهاج', name_en: 'Sohag' },
];

export const CITIES: City[] = [
  // Cairo (1)
  { id: '101', governorate_id: '1', name_ar: 'مدينة نصر', name_en: 'Nasr City' },
  { id: '102', governorate_id: '1', name_ar: 'مصر الجديدة', name_en: 'Heliopolis' },
  { id: '103', governorate_id: '1', name_ar: 'المعادي', name_en: 'Maadi' },
  { id: '104', governorate_id: '1', name_ar: 'التجمع الخامس', name_en: 'Fifth Settlement' },
  { id: '105', governorate_id: '1', name_ar: 'شبرا', name_en: 'Shubra' },
  { id: '106', governorate_id: '1', name_ar: 'الزمالك', name_en: 'Zamalek' },
  { id: '107', governorate_id: '1', name_ar: 'الرحاب', name_en: 'Al Rehab' },
  { id: '108', governorate_id: '1', name_ar: 'مدينتي', name_en: 'Madinaty' },
  { id: '109', governorate_id: '1', name_ar: 'الشروق', name_en: 'El Shorouk' },
  { id: '110', governorate_id: '1', name_ar: 'العبور', name_en: 'El Obour' },
  { id: '111', governorate_id: '1', name_ar: 'المقطم', name_en: 'Mokattam' },
  { id: '112', governorate_id: '1', name_ar: 'حلوان', name_en: 'Helwan' },
  { id: '113', governorate_id: '1', name_ar: 'عين شمس', name_en: 'Ain Shams' },
  { id: '114', governorate_id: '1', name_ar: 'المرج', name_en: 'El Marg' },
  { id: '115', governorate_id: '1', name_ar: 'المطرية', name_en: 'Matareya' },
  { id: '116', governorate_id: '1', name_ar: 'حدائق القبة', name_en: 'Hadayek El Kobba' },
  { id: '117', governorate_id: '1', name_ar: 'الزيتون', name_en: 'El Zeitoun' },
  { id: '118', governorate_id: '1', name_ar: 'وسط البلد', name_en: 'Downtown' },
  { id: '119', governorate_id: '1', name_ar: 'السيدة زينب', name_en: 'Sayeda Zeinab' },
  { id: '120', governorate_id: '1', name_ar: 'مصر القديمة', name_en: 'Old Cairo' },

  // Giza (2)
  { id: '201', governorate_id: '2', name_ar: '6 أكتوبر', name_en: '6th of October' },
  { id: '202', governorate_id: '2', name_ar: 'الشيخ زايد', name_en: 'Sheikh Zayed' },
  { id: '203', governorate_id: '2', name_ar: 'المهندسين', name_en: 'Mohandessin' },
  { id: '204', governorate_id: '2', name_ar: 'الدقي', name_en: 'Dokki' },
  { id: '205', governorate_id: '2', name_ar: 'الهرم', name_en: 'Haram' },
  { id: '206', governorate_id: '2', name_ar: 'فيصل', name_en: 'Faisal' },
  { id: '207', governorate_id: '2', name_ar: 'العجوزة', name_en: 'Agouza' },
  { id: '208', governorate_id: '2', name_ar: 'إمبابة', name_en: 'Imbaba' },
  { id: '209', governorate_id: '2', name_ar: 'الوراق', name_en: 'Warraq' },
  { id: '210', governorate_id: '2', name_ar: 'بولاق الدكرور', name_en: 'Bulaq Dakrour' },
  { id: '211', governorate_id: '2', name_ar: 'العياط', name_en: 'Ayat' },
  { id: '212', governorate_id: '2', name_ar: 'البدرشين', name_en: 'Badrashein' },
  { id: '213', governorate_id: '2', name_ar: 'الصف', name_en: 'Saff' },
  { id: '214', governorate_id: '2', name_ar: 'أطفيح', name_en: 'Atfih' },
  { id: '215', governorate_id: '2', name_ar: 'الواحات البحرية', name_en: 'Bahariya Oasis' },

  // Alexandria (3)
  { id: '301', governorate_id: '3', name_ar: 'سموحة', name_en: 'Smouha' },
  { id: '302', governorate_id: '3', name_ar: 'ميامي', name_en: 'Miami' },
  { id: '303', governorate_id: '3', name_ar: 'المنتزه', name_en: 'Montaza' },
  { id: '304', governorate_id: '3', name_ar: 'رشدي', name_en: 'Roushdy' },
  { id: '305', governorate_id: '3', name_ar: 'ستانلي', name_en: 'Stanley' },
  { id: '306', governorate_id: '3', name_ar: 'جليم', name_en: 'Glim' },
  { id: '307', governorate_id: '3', name_ar: 'سيدي جابر', name_en: 'Sidi Gaber' },
  { id: '308', governorate_id: '3', name_ar: 'محرم بك', name_en: 'Moharam Bek' },
  { id: '309', governorate_id: '3', name_ar: 'العجمي', name_en: 'Agami' },
  { id: '310', governorate_id: '3', name_ar: 'العامرية', name_en: 'Amriya' },
  { id: '311', governorate_id: '3', name_ar: 'برج العرب', name_en: 'Borg El Arab' },
  { id: '312', governorate_id: '3', name_ar: 'المنشية', name_en: 'Mansheya' },
  { id: '313', governorate_id: '3', name_ar: 'العطارين', name_en: 'Attarin' },

  // Dakahlia (4)
  { id: '401', governorate_id: '4', name_ar: 'المنصورة', name_en: 'Mansoura' },
  { id: '402', governorate_id: '4', name_ar: 'طلخا', name_en: 'Talkha' },
  { id: '403', governorate_id: '4', name_ar: 'ميت غمر', name_en: 'Mit Ghamr' },
  { id: '404', governorate_id: '4', name_ar: 'دكرنس', name_en: 'Dekernes' },
  { id: '405', governorate_id: '4', name_ar: 'أجا', name_en: 'Aga' },
  { id: '406', governorate_id: '4', name_ar: 'منية النصر', name_en: 'Menia El Nasr' },
  { id: '407', governorate_id: '4', name_ar: 'السنبلاوين', name_en: 'Sinbillawin' },
  { id: '408', governorate_id: '4', name_ar: 'الكردي', name_en: 'El Kurdi' },
  { id: '409', governorate_id: '4', name_ar: 'بني عبيد', name_en: 'Bani Ubaid' },
  { id: '410', governorate_id: '4', name_ar: 'المنزلة', name_en: 'Al Manzala' },
  { id: '411', governorate_id: '4', name_ar: 'تمى الأمديد', name_en: 'Tami El Amdid' },
  { id: '412', governorate_id: '4', name_ar: 'الجمالية', name_en: 'El Gamaliya' },
  { id: '413', governorate_id: '4', name_ar: 'شربين', name_en: 'Sherbin' },
  { id: '414', governorate_id: '4', name_ar: 'المطرية', name_en: 'Matareya' },
  { id: '415', governorate_id: '4', name_ar: 'بلقاس', name_en: 'Belqas' },
  { id: '416', governorate_id: '4', name_ar: 'ميت سلسيل', name_en: 'Mit Salsil' },
  { id: '417', governorate_id: '4', name_ar: 'جمصة', name_en: 'Gamasa' },
  { id: '418', governorate_id: '4', name_ar: 'محلة دمنة', name_en: 'Mahalat Damana' },
  { id: '419', governorate_id: '4', name_ar: 'نبروه', name_en: 'Nabroh' },

  // Red Sea (5)
  { id: '501', governorate_id: '5', name_ar: 'الغردقة', name_en: 'Hurghada' },
  { id: '502', governorate_id: '5', name_ar: 'رأس غارب', name_en: 'Ras Gharib' },
  { id: '503', governorate_id: '5', name_ar: 'سفاجا', name_en: 'Safaga' },
  { id: '504', governorate_id: '5', name_ar: 'القصير', name_en: 'El Qusiar' },
  { id: '505', governorate_id: '5', name_ar: 'مرسى علم', name_en: 'Marsa Alam' },
  { id: '506', governorate_id: '5', name_ar: 'شلاتين', name_en: 'Shalatin' },
  { id: '507', governorate_id: '5', name_ar: 'حلايب', name_en: 'Halaib' },

  // Beheira (6)
  { id: '601', governorate_id: '6', name_ar: 'دمنهور', name_en: 'Damanhour' },
  { id: '602', governorate_id: '6', name_ar: 'كفر الدوار', name_en: 'Kafr El Dawar' },
  { id: '603', governorate_id: '6', name_ar: 'رشيد', name_en: 'Rashid' },
  { id: '604', governorate_id: '6', name_ar: 'إدكو', name_en: 'Edco' },
  { id: '605', governorate_id: '6', name_ar: 'أبو المطامير', name_en: 'Abu al-Matamir' },
  { id: '606', governorate_id: '6', name_ar: 'أبو حمص', name_en: 'Abu Homs' },
  { id: '607', governorate_id: '6', name_ar: 'الدلنجات', name_en: 'Delengat' },
  { id: '608', governorate_id: '6', name_ar: 'المحمودية', name_en: 'Mahmoudiyah' },
  { id: '609', governorate_id: '6', name_ar: 'الرحمانية', name_en: 'Rahmaniyah' },
  { id: '610', governorate_id: '6', name_ar: 'إيتاي البارود', name_en: 'Itai El Baroud' },
  { id: '611', governorate_id: '6', name_ar: 'حوش عيسى', name_en: 'Housh Eissa' },
  { id: '612', governorate_id: '6', name_ar: 'شبراخيت', name_en: 'Shubrakhit' },
  { id: '613', governorate_id: '6', name_ar: 'كوم حمادة', name_en: 'Kom Hamada' },
  { id: '614', governorate_id: '6', name_ar: 'بدر', name_en: 'Badr' },
  { id: '615', governorate_id: '6', name_ar: 'وادي النطرون', name_en: 'Wadi El Natrun' },
  { id: '616', governorate_id: '6', name_ar: 'النوبارية الجديدة', name_en: 'New Nubaria' },

  // Fayoum (7)
  { id: '701', governorate_id: '7', name_ar: 'الفيوم', name_en: 'Fayoum' },
  { id: '702', governorate_id: '7', name_ar: 'الفيوم الجديدة', name_en: 'New Fayoum' },
  { id: '703', governorate_id: '7', name_ar: 'طامية', name_en: 'Tamiya' },
  { id: '704', governorate_id: '7', name_ar: 'سنورس', name_en: 'Snores' },
  { id: '705', governorate_id: '7', name_ar: 'إطسا', name_en: 'Etsa' },
  { id: '706', governorate_id: '7', name_ar: 'إبشواي', name_en: 'Ibsheway' },
  { id: '707', governorate_id: '7', name_ar: 'يوسف الصديق', name_en: 'Yusuf El Sediaq' },

  // Gharbia (8)
  { id: '801', governorate_id: '8', name_ar: 'طنطا', name_en: 'Tanta' },
  { id: '802', governorate_id: '8', name_ar: 'المحلة الكبرى', name_en: 'Al Mahalla Al Kobra' },
  { id: '803', governorate_id: '8', name_ar: 'كفر الزيات', name_en: 'Kafr El Zayat' },
  { id: '804', governorate_id: '8', name_ar: 'زفتى', name_en: 'Zifta' },
  { id: '805', governorate_id: '8', name_ar: 'السنطة', name_en: 'El Santa' },
  { id: '806', governorate_id: '8', name_ar: 'قطور', name_en: 'Qutour' },
  { id: '807', governorate_id: '8', name_ar: 'بسيون', name_en: 'Basyoun' },
  { id: '808', governorate_id: '8', name_ar: 'سمنود', name_en: 'Samannoud' },

  // Ismailia (9)
  { id: '901', governorate_id: '9', name_ar: 'الإسماعيلية', name_en: 'Ismailia' },
  { id: '902', governorate_id: '9', name_ar: 'فايد', name_en: 'Fayed' },
  { id: '903', governorate_id: '9', name_ar: 'القنطرة شرق', name_en: 'Qantara Sharq' },
  { id: '904', governorate_id: '9', name_ar: 'القنطرة غرب', name_en: 'Qantara Gharb' },
  { id: '905', governorate_id: '9', name_ar: 'التل الكبير', name_en: 'El Tal El Kabier' },
  { id: '906', governorate_id: '9', name_ar: 'أبو صوير', name_en: 'Abu Sawir' },
  { id: '907', governorate_id: '9', name_ar: 'القصاصين الجديدة', name_en: 'Kasasien El Gedida' },

  // Monufia (10)
  { id: '1001', governorate_id: '10', name_ar: 'شبين الكوم', name_en: 'Shibin El Kom' },
  { id: '1002', governorate_id: '10', name_ar: 'مدينة السادات', name_en: 'Sadat City' },
  { id: '1003', governorate_id: '10', name_ar: 'منوف', name_en: 'Menouf' },
  { id: '1004', governorate_id: '10', name_ar: 'سرس الليان', name_en: 'Sars El-Layan' },
  { id: '1005', governorate_id: '10', name_ar: 'أشمون', name_en: 'Ashmoun' },
  { id: '1006', governorate_id: '10', name_ar: 'الباجور', name_en: 'Al Bagour' },
  { id: '1007', governorate_id: '10', name_ar: 'قويسنا', name_en: 'Quesna' },
  { id: '1008', governorate_id: '10', name_ar: 'بركة السبع', name_en: 'Berkat El Saba' },
  { id: '1009', governorate_id: '10', name_ar: 'تلا', name_en: 'Tala' },
  { id: '1010', governorate_id: '10', name_ar: 'الشهداء', name_en: 'Al Shohada' },

  // Minya (11)
  { id: '1101', governorate_id: '11', name_ar: 'المنيا', name_en: 'Minya' },
  { id: '1102', governorate_id: '11', name_ar: 'المنيا الجديدة', name_en: 'Minya El Gedida' },
  { id: '1103', governorate_id: '11', name_ar: 'العدوة', name_en: 'El Adwa' },
  { id: '1104', governorate_id: '11', name_ar: 'مغاغة', name_en: 'Maghagha' },
  { id: '1105', governorate_id: '11', name_ar: 'بني مزار', name_en: 'Bani Mazar' },
  { id: '1106', governorate_id: '11', name_ar: 'مطاي', name_en: 'Mattay' },
  { id: '1107', governorate_id: '11', name_ar: 'سمالوط', name_en: 'Samalut' },
  { id: '1108', governorate_id: '11', name_ar: 'المدينة الفكرية', name_en: 'Madinat El Fekria' },
  { id: '1109', governorate_id: '11', name_ar: 'ملوي', name_en: 'Meloy' },
  { id: '1110', governorate_id: '11', name_ar: 'دير مواس', name_en: 'Deir Mawas' },

  // Qalyubia (12)
  { id: '1201', governorate_id: '12', name_ar: 'بنها', name_en: 'Banha' },
  { id: '1202', governorate_id: '12', name_ar: 'قليوب', name_en: 'Qalyub' },
  { id: '1203', governorate_id: '12', name_ar: 'شبرا الخيمة', name_en: 'Shubra Al Khaymah' },
  { id: '1204', governorate_id: '12', name_ar: 'القناطر الخيرية', name_en: 'Al Qanater Charity' },
  { id: '1205', governorate_id: '12', name_ar: 'الخانكة', name_en: 'Khanka' },
  { id: '1206', governorate_id: '12', name_ar: 'كفر شكر', name_en: 'Kafr Shukr' },
  { id: '1207', governorate_id: '12', name_ar: 'طوخ', name_en: 'Tukh' },
  { id: '1208', governorate_id: '12', name_ar: 'قها', name_en: 'Qaha' },
  { id: '1209', governorate_id: '12', name_ar: 'العبور', name_en: 'Obour' },
  { id: '1210', governorate_id: '12', name_ar: 'الخصوص', name_en: 'Khosous' },
  { id: '1211', governorate_id: '12', name_ar: 'شبين القناطر', name_en: 'Shibin Al Qanater' },

  // New Valley (13)
  { id: '1301', governorate_id: '13', name_ar: 'الخارجة', name_en: 'El Kharga' },
  { id: '1302', governorate_id: '13', name_ar: 'باريس', name_en: 'Paris' },
  { id: '1303', governorate_id: '13', name_ar: 'موط', name_en: 'Mout' },
  { id: '1304', governorate_id: '13', name_ar: 'الفرافرة', name_en: 'Farafra' },
  { id: '1305', governorate_id: '13', name_ar: 'بلاط', name_en: 'Balat' },

  // Suez (14)
  { id: '1401', governorate_id: '14', name_ar: 'السويس', name_en: 'Suez' },

  // Aswan (15)
  { id: '1501', governorate_id: '15', name_ar: 'أسوان', name_en: 'Aswan' },
  { id: '1502', governorate_id: '15', name_ar: 'أسوان الجديدة', name_en: 'Aswan El Gedida' },
  { id: '1503', governorate_id: '15', name_ar: 'دراو', name_en: 'Drau' },
  { id: '1504', governorate_id: '15', name_ar: 'كوم أمبو', name_en: 'Kom Ombo' },
  { id: '1505', governorate_id: '15', name_ar: 'نصر النوبة', name_en: 'Nasr Al Nuba' },
  { id: '1506', governorate_id: '15', name_ar: 'كلابشة', name_en: 'Kalabsha' },
  { id: '1507', governorate_id: '15', name_ar: 'إدفو', name_en: 'Edfu' },
  { id: '1508', governorate_id: '15', name_ar: 'الرديسية', name_en: 'Al-Radisiyah' },
  { id: '1509', governorate_id: '15', name_ar: 'البصيلية', name_en: 'Al Basilia' },
  { id: '1510', governorate_id: '15', name_ar: 'السباعية', name_en: 'Al Sibaeia' },
  { id: '1511', governorate_id: '15', name_ar: 'ابوسمبل السياحية', name_en: 'Abu Simbel Tourist' },

  // Assiut (16)
  { id: '1601', governorate_id: '16', name_ar: 'أسيوط', name_en: 'Assiut' },
  { id: '1602', governorate_id: '16', name_ar: 'أسيوط الجديدة', name_en: 'Assiut El Gedida' },
  { id: '1603', governorate_id: '16', name_ar: 'ديروط', name_en: 'Dayrout' },
  { id: '1604', governorate_id: '16', name_ar: 'منفلوط', name_en: 'Manfalut' },
  { id: '1605', governorate_id: '16', name_ar: 'القوصية', name_en: 'Qusiya' },
  { id: '1606', governorate_id: '16', name_ar: 'أبنوب', name_en: 'Abnoub' },
  { id: '1607', governorate_id: '16', name_ar: 'أبو تيج', name_en: 'Abu Tig' },
  { id: '1608', governorate_id: '16', name_ar: 'الغنايم', name_en: 'El Ghanaim' },
  { id: '1609', governorate_id: '16', name_ar: 'ساحل سليم', name_en: 'Sahel Selim' },
  { id: '1610', governorate_id: '16', name_ar: 'البداري', name_en: 'El Badari' },
  { id: '1611', governorate_id: '16', name_ar: 'صدفا', name_en: 'Sidfa' },

  // Beni Suef (17)
  { id: '1701', governorate_id: '17', name_ar: 'بني سويف', name_en: 'Beni Suef' },
  { id: '1702', governorate_id: '17', name_ar: 'بني سويف الجديدة', name_en: 'Beni Suef El Gedida' },
  { id: '1703', governorate_id: '17', name_ar: 'الواسطى', name_en: 'Al Wasta' },
  { id: '1704', governorate_id: '17', name_ar: 'ناصر', name_en: 'Nasser' },
  { id: '1705', governorate_id: '17', name_ar: 'إهناسيا', name_en: 'Ehnasia' },
  { id: '1706', governorate_id: '17', name_ar: 'ببا', name_en: 'Biba' },
  { id: '1707', governorate_id: '17', name_ar: 'الفشن', name_en: 'Fashn' },
  { id: '1708', governorate_id: '17', name_ar: 'سمسطا', name_en: 'Somasta' },

  // Port Said (18)
  { id: '1801', governorate_id: '18', name_ar: 'بورسعيد', name_en: 'Port Said' },
  { id: '1802', governorate_id: '18', name_ar: 'بورفؤاد', name_en: 'Port Fouad' },

  // Damietta (19)
  { id: '1901', governorate_id: '19', name_ar: 'دمياط', name_en: 'Damietta' },
  { id: '1902', governorate_id: '19', name_ar: 'دمياط الجديدة', name_en: 'New Damietta' },
  { id: '1903', governorate_id: '19', name_ar: 'رأس البر', name_en: 'Ras El Bar' },
  { id: '1904', governorate_id: '19', name_ar: 'فارسكور', name_en: 'Faraskour' },
  { id: '1905', governorate_id: '19', name_ar: 'الزرقا', name_en: 'Zarqa' },
  { id: '1906', governorate_id: '19', name_ar: 'السرو', name_en: 'Alsaru' },
  { id: '1907', governorate_id: '19', name_ar: 'الروضة', name_en: 'Alruwda' },
  { id: '1908', governorate_id: '19', name_ar: 'كفر البطيخ', name_en: 'Kafr El-Batikh' },
  { id: '1909', governorate_id: '19', name_ar: 'عزبة البرج', name_en: 'Azbet El Burg' },
  { id: '1910', governorate_id: '19', name_ar: 'ميت أبو غالب', name_en: 'Mit Abu Ghaleb' },
  { id: '1911', governorate_id: '19', name_ar: 'كفر سعد', name_en: 'Kafr Saad' },

  // Sharkia (20)
  { id: '2001', governorate_id: '20', name_ar: 'الزقازيق', name_en: 'Zagazig' },
  { id: '2002', governorate_id: '20', name_ar: 'العاشر من رمضان', name_en: 'Al العاشر Of Ramadan' },
  { id: '2003', governorate_id: '20', name_ar: 'منيا القمح', name_en: 'Minya Al Qamh' },
  { id: '2004', governorate_id: '20', name_ar: 'بلبيس', name_en: 'Belbeis' },
  { id: '2005', governorate_id: '20', name_ar: 'مشتول السوق', name_en: 'Mashtoul El Souq' },
  { id: '2006', governorate_id: '20', name_ar: 'القنايات', name_en: 'Qenaiat' },
  { id: '2007', governorate_id: '20', name_ar: 'أبو حماد', name_en: 'Abu Hammad' },
  { id: '2008', governorate_id: '20', name_ar: 'القرين', name_en: 'El Qurain' },
  { id: '2009', governorate_id: '20', name_ar: 'ههيا', name_en: 'Hehia' },
  { id: '2010', governorate_id: '20', name_ar: 'أبو كبير', name_en: 'Abu Kabir' },
  { id: '2011', governorate_id: '20', name_ar: 'فاقوس', name_en: 'Faccus' },
  { id: '2012', governorate_id: '20', name_ar: 'الصالحية الجديدة', name_en: 'El Salihia El Gedida' },
  { id: '2013', governorate_id: '20', name_ar: 'الإبراهيمية', name_en: 'Al Ibrahimiyah' },
  { id: '2014', governorate_id: '20', name_ar: 'ديرب نجم', name_en: 'Deirb Negm' },
  { id: '2015', governorate_id: '20', name_ar: 'كفر صقر', name_en: 'Kafr Saqr' },
  { id: '2016', governorate_id: '20', name_ar: 'أولاد صقر', name_en: 'Awlad Saqr' },
  { id: '2017', governorate_id: '20', name_ar: 'الحسينية', name_en: 'Husseiniya' },
  { id: '2018', governorate_id: '20', name_ar: 'صان الحجر القبلية', name_en: 'San El Hagar El Qabliya' },
  { id: '2019', governorate_id: '20', name_ar: 'منشأة أبو عمر', name_en: 'Manshayat Abu Omar' },

  // South Sinai (21)
  { id: '2101', governorate_id: '21', name_ar: 'الطور', name_en: 'El Tor' },
  { id: '2102', governorate_id: '21', name_ar: 'شرم الشيخ', name_en: 'Sharm El Sheikh' },
  { id: '2103', governorate_id: '21', name_ar: 'دهب', name_en: 'Dahab' },
  { id: '2104', governorate_id: '21', name_ar: 'نويبع', name_en: 'Nuweiba' },
  { id: '2105', governorate_id: '21', name_ar: 'طابا', name_en: 'Taba' },
  { id: '2106', governorate_id: '21', name_ar: 'سانت كاترين', name_en: 'Saint Catherine' },
  { id: '2107', governorate_id: '21', name_ar: 'أبو رديس', name_en: 'Abu Redis' },
  { id: '2108', governorate_id: '21', name_ar: 'أبو زنيمة', name_en: 'Abu Zenima' },
  { id: '2109', governorate_id: '21', name_ar: 'رأس سدر', name_en: 'Ras Sidr' },

  // Kafr El Sheikh (22)
  { id: '2201', governorate_id: '22', name_ar: 'كفر الشيخ', name_en: 'Kafr El Sheikh' },
  { id: '2202', governorate_id: '22', name_ar: 'سيدي سالم', name_en: 'Sidi Salem' },
  { id: '2203', governorate_id: '22', name_ar: 'دسوق', name_en: 'Desouq' },
  { id: '2204', governorate_id: '22', name_ar: 'سيدي غازي', name_en: 'Sidi Ghazi' },
  { id: '2205', governorate_id: '22', name_ar: 'بيلا', name_en: 'Bila' },
  { id: '2206', governorate_id: '22', name_ar: 'الحامول', name_en: 'El Hamool' },
  { id: '2207', governorate_id: '22', name_ar: 'بلطيم', name_en: 'Baltim' },
  { id: '2208', governorate_id: '22', name_ar: 'مصيف بلطيم', name_en: 'Masief Baltim' },
  { id: '2209', governorate_id: '22', name_ar: 'قلين', name_en: 'Qulin' },
  { id: '2210', governorate_id: '22', name_ar: 'مطوربس', name_en: 'Motobas' },
  { id: '2211', governorate_id: '22', name_ar: 'فوه', name_en: 'Fuwa' },
  { id: '2212', governorate_id: '22', name_ar: 'الرياض', name_en: 'El Reyad' },
  { id: '2213', governorate_id: '22', name_ar: 'برج البرلس', name_en: 'Burg El Burullus' },

  // Matrouh (23)
  { id: '2301', governorate_id: '23', name_ar: 'مرسى مطروح', name_en: 'Marsa Matrouh' },
  { id: '2302', governorate_id: '23', name_ar: 'الحمام', name_en: 'El Hamam' },
  { id: '2303', governorate_id: '23', name_ar: 'العلمين', name_en: 'Alamein' },
  { id: '2304', governorate_id: '23', name_ar: 'الضبعة', name_en: 'Dabaa' },
  { id: '2305', governorate_id: '23', name_ar: 'النجيلة', name_en: 'Al-Nagila' },
  { id: '2306', governorate_id: '23', name_ar: 'سيدي براني', name_en: 'Sidi Brani' },
  { id: '2307', governorate_id: '23', name_ar: 'السلوم', name_en: 'Salloum' },
  { id: '2308', governorate_id: '23', name_ar: 'سيوة', name_en: 'Siwa' },

  // Luxor (24)
  { id: '2401', governorate_id: '24', name_ar: 'الأقصر', name_en: 'Luxor' },
  { id: '2402', governorate_id: '24', name_ar: 'الأقصر الجديدة', name_en: 'New Luxor' },
  { id: '2403', governorate_id: '24', name_ar: 'إسنا', name_en: 'Esna' },
  { id: '2404', governorate_id: '24', name_ar: 'طيبة الجديدة', name_en: 'New Tiba' },
  { id: '2405', governorate_id: '24', name_ar: 'الزينية', name_en: 'Al Zinia' },
  { id: '2406', governorate_id: '24', name_ar: 'البياضية', name_en: 'Al Bayadia' },
  { id: '2407', governorate_id: '24', name_ar: 'القرنة', name_en: 'Al Qarna' },
  { id: '2408', governorate_id: '24', name_ar: 'أرمنت', name_en: 'Armant' },
  { id: '2409', governorate_id: '24', name_ar: 'الطود', name_en: 'Al Tud' },

  // Qena (25)
  { id: '2501', governorate_id: '25', name_ar: 'قنا', name_en: 'Qena' },
  { id: '2502', governorate_id: '25', name_ar: 'قنا الجديدة', name_en: 'New Qena' },
  { id: '2503', governorate_id: '25', name_ar: 'أبو تشت', name_en: 'Abu Tesht' },
  { id: '2504', governorate_id: '25', name_ar: 'نجع حمادي', name_en: 'Nag Hammadi' },
  { id: '2505', governorate_id: '25', name_ar: 'دشنا', name_en: 'Deshna' },
  { id: '2506', governorate_id: '25', name_ar: 'الوقف', name_en: 'Alwaqf' },
  { id: '2507', governorate_id: '25', name_ar: 'قفط', name_en: 'Qaft' },
  { id: '2508', governorate_id: '25', name_ar: 'نقادة', name_en: 'Naqada' },
  { id: '2509', governorate_id: '25', name_ar: 'فرشوط', name_en: 'Farshout' },
  { id: '2510', governorate_id: '25', name_ar: 'قوص', name_en: 'Quos' },

  // North Sinai (26)
  { id: '2601', governorate_id: '26', name_ar: 'العريش', name_en: 'Arish' },
  { id: '2602', governorate_id: '26', name_ar: 'الشيخ زويد', name_en: 'Sheikh Zowaid' },
  { id: '2603', governorate_id: '26', name_ar: 'نخل', name_en: 'Nakhl' },
  { id: '2604', governorate_id: '26', name_ar: 'رفح', name_en: 'Rafah' },
  { id: '2605', governorate_id: '26', name_ar: 'بئر العبد', name_en: 'Bir al-Abed' },
  { id: '2606', governorate_id: '26', name_ar: 'الحسنة', name_en: 'Al Hasana' },

  // Sohag (27)
  { id: '2701', governorate_id: '27', name_ar: 'سوهاج', name_en: 'Sohag' },
  { id: '2702', governorate_id: '27', name_ar: 'سوهاج الجديدة', name_en: 'Sohag El Gedida' },
  { id: '2703', governorate_id: '27', name_ar: 'أخميم', name_en: 'Akhmeem' },
  { id: '2704', governorate_id: '27', name_ar: 'أخميم الجديدة', name_en: 'Akhmim El Gedida' },
  { id: '2705', governorate_id: '27', name_ar: 'البلينا', name_en: 'Albalina' },
  { id: '2706', governorate_id: '27', name_ar: 'المراغة', name_en: 'El Maragha' },
  { id: '2707', governorate_id: '27', name_ar: 'المنشأة', name_en: 'al-Munsha\'a' },
  { id: '2708', governorate_id: '27', name_ar: 'دار السلام', name_en: 'Dar El Salam' },
  { id: '2709', governorate_id: '27', name_ar: 'جرجا', name_en: 'Gerga' },
  { id: '2710', governorate_id: '27', name_ar: 'جهينة', name_en: 'Juhayna' },
  { id: '2711', governorate_id: '27', name_ar: 'ساقلتة', name_en: 'Saqilta' },
  { id: '2712', governorate_id: '27', name_ar: 'طما', name_en: 'Tama' },
  { id: '2713', governorate_id: '27', name_ar: 'طهطا', name_en: 'Tahta' },
  { id: '2714', governorate_id: '27', name_ar: 'الكوثر', name_en: 'Al Kawthar' },
];

// Generate generic areas for cities that don't have specific data
const generateGenericAreas = (): Area[] => {
  const genericAreas: Area[] = [];
  const specificCityIds = new Set(SPECIFIC_AREAS.map(a => a.city_id));

  CITIES.forEach(city => {
    if (!specificCityIds.has(city.id)) {
      genericAreas.push(
        { id: `${city.id}01`, city_id: city.id, name_ar: 'وسط البلد', name_en: 'City Center' },
        { id: `${city.id}02`, city_id: city.id, name_ar: 'الحي البحري', name_en: 'Northern District' },
        { id: `${city.id}03`, city_id: city.id, name_ar: 'الحي القبلي', name_en: 'Southern District' },
        { id: `${city.id}04`, city_id: city.id, name_ar: 'المنطقة الصناعية', name_en: 'Industrial Zone' },
        { id: `${city.id}05`, city_id: city.id, name_ar: 'الزهراء', name_en: 'Al Zahraa' }
      );
    }
  });

  return genericAreas;
};

export const AREAS: Area[] = [...SPECIFIC_AREAS, ...generateGenericAreas()];

export const getLocationName = (id: string, type: 'gov' | 'city' | 'area', lang: 'EN' | 'AR') => {
  let list: Location[] = [];
  if (type === 'gov') list = GOVERNORATES;
  if (type === 'city') list = CITIES;
  if (type === 'area') list = AREAS;
  
  const item = list.find(i => i.id === id);
  return item ? (lang === 'AR' ? item.name_ar : item.name_en) : '';
};
