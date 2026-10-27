import { Linking } from 'react-native';
import { BASE_URL } from './api';
import { getLanguage } from './i18n';
import { legalPath } from './i18n/core';

/** Opens the privacy policy, terms or support page in the language the user chose in the app. */
export const openLegalPage = page => Linking.openURL(`${BASE_URL}${legalPath(page, getLanguage())}`);
