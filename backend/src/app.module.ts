import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientesModule } from './clientes/clientes.module';
import { ProductosModule } from './productos/productos.module';
import { TasasCambioModule } from './tasas-cambio/tasas-cambio.module';

import { CategoriasModule } from './categorias/categorias.module';
import { MonedasModule } from './monedas/monedas.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { RolesModule } from './roles/roles.module';
import { EmpresasModule } from './empresas/empresas.module';
import { SucursalesModule } from './sucursales/sucursales.module';
import { BancosModule } from './bancos/bancos.module';
import { CuentasBancariasModule } from './cuentas-bancarias/cuentas-bancarias.module';
import { PermisosModule } from './permisos/permisos.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AlmacenesModule } from './almacenes/almacenes.module';
import { StockModule } from './stock/stock.module';
import { TransferenciasModule } from './transferencias/transferencias.module';
import { FacturasModule } from './facturas/facturas.module';
import { DevolucionesModule } from './devoluciones/devoluciones.module';
import { CuentasCobrarModule } from './cuentas-cobrar/cuentas-cobrar.module';
import { TiposDocumentosModule } from './tipos-documentos/tipos-documentos.module';
import { NivelesPrecioModule } from './niveles-precio/niveles-precio.module';
import { MetodosPagoModule } from './metodos-pago/metodos-pago.module';
import { PreliminaresModule } from './preliminares/preliminares.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { VendedoresModule } from './vendedores/vendedores.module';
import { ParametrosFiscalesModule } from './parametros-fiscales/parametros-fiscales.module';
import { LotesModule } from './lotes/lotes.module';
import { SerialesModule } from './seriales/seriales.module';
import { ComprasModule } from './compras/compras.module';
import { CuentasPagarModule } from './cuentas-pagar/cuentas-pagar.module';
import { RecibosCobrosModule } from './recibos-cobro/recibos-cobro.module';
import { PagosProveedoresModule } from './pagos-proveedores/pagos-proveedores.module';
import { AnulacionesModule } from './anulaciones/anulaciones.module';
import { InventarioModule } from './inventario/inventario.module';
import { SistemaModule } from './sistema/sistema.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false, // We use the existing schema, no auto-sync
    }),
    ClientesModule,
    ProductosModule,
    TasasCambioModule,
    CategoriasModule,
    MonedasModule,
    UsuariosModule,
    RolesModule,
    EmpresasModule,
    SucursalesModule,
    BancosModule,
    CuentasBancariasModule,
    PermisosModule,
    AuthModule,
    AlmacenesModule,
    StockModule,
    TransferenciasModule,
    FacturasModule,
    DevolucionesModule,
    CuentasCobrarModule,
    TiposDocumentosModule,
    NivelesPrecioModule,
    MetodosPagoModule,
    PreliminaresModule,
    ProveedoresModule,
    VendedoresModule,
    ParametrosFiscalesModule,
    LotesModule,
    SerialesModule,
    ComprasModule,
    CuentasPagarModule,
    RecibosCobrosModule,
    PagosProveedoresModule,
    AnulacionesModule,
    InventarioModule,
    SistemaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
