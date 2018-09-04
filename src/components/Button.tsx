import React from 'react';
import { StyleSheet, css } from 'aphrodite';

import { BRAND_COLOR } from '../constants';

interface ButtonStyles {
  button: Record<string, any>;
  ':hover': Record<string, any>;
}

export const buttonStyles: ButtonStyles = {
  button: {
    borderRadius: 3,
    padding: '3px 16px 4px',
    backgroundColor: BRAND_COLOR,
    borderColor: '#666',
    borderStyle: 'solid',
    borderWidth: 1,
    color: '#fff',
    transition: 'background-color 0.5s ease',
    boxShadow: '0px 0px 1px',
  },

  ':hover': {
    textDecorationLine: 'none',
    backgroundColor: '#aaa',
  },
};

interface IProps {
  children: any;
  onClick: () => any;
}

const Button: React.SFC<IProps> = ({ children, onClick }) => {
  return (
    <button onClick={onClick} type="button" className={css(styles.button)}>
      {children}
    </button>
  );
};

export default Button;

const styles = StyleSheet.create(buttonStyles);
