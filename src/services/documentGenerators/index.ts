
import { Gerador_PontoDeVenda } from './Gerador_PontoDeVenda';
import { Gerador_Facturacao } from './Gerador_Facturacao';
import { Gerador_Tesouraria } from './Gerador_Tesouraria';
import { Gerador_Vendas } from './Gerador_Vendas';
import { Gerador_Armazem } from './Gerador_Armazem';

export const DocumentGenerator = {
    PontoDeVenda: new Gerador_PontoDeVenda(),
    Facturacao: new Gerador_Facturacao(),
    Tesouraria: new Gerador_Tesouraria(),
    Vendas: new Gerador_Vendas(),
    Armazem: new Gerador_Armazem()
};

export {
    Gerador_PontoDeVenda,
    Gerador_Facturacao,
    Gerador_Tesouraria,
    Gerador_Vendas,
    Gerador_Armazem
};
