import React from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from './index';

// Admin and merchant panels are English-only; shared components inside them
// read this fixed instance instead of the visitor's chosen language.
const englishI18n = i18n.cloneInstance({ lng: 'en' });

const EnglishOnly = ({ children }) => <I18nextProvider i18n={englishI18n}>{children}</I18nextProvider>;

export default EnglishOnly;
