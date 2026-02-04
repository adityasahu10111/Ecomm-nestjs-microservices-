import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import type { UserContext } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { mapRpcErrorToHttp } from '@app/rpc';
import { firstValueFrom, Observable } from 'rxjs';
import { Public } from '../auth/public.decorator';

type Product = {
  _id: string;
  name: string;
  description: string;
  price: number;
  status: 'DRAFT' | 'ACTIVE';
  imageUrl: string | undefined;
  createdByClerkUserId: string | undefined;
};

@Controller()
export class ProductsHttpController {
  constructor(
    // gateway talks to catalog via RMQ client
    @Inject('CATALOG_CLIENT') private readonly catalogClient: ClientProxy,
  ) {}

  @Post('products')
  async createProduct(
    @CurrentUser() user: UserContext,

    @Body()
    body: {
      name: string;
      description: string;
      price: number;
      status?: string;
      imageUrl?: string;
    },
  ) {
    let product: Product;

    const payload = {
      name: body.name,
      description: body.description,
      price: Number(body.price),
      status: body.status,
      imageUrl: '',
      createdByClerkUserId: user.clerkUserId,
    };

    // RMQ request and response pattern

    try {
      product = await firstValueFrom(
        this.catalogClient.send('product.create', payload),
      );
    } catch (err) {
      mapRpcErrorToHttp(err);
    }
    return product;
  }

  @Get('products')
  @Public()
  async listProducts() {
    try {
      const products =  await firstValueFrom(this.catalogClient.send('product.list', {}));
      return products;
    } catch (err) {
      mapRpcErrorToHttp(err);
    }
  }

   @Get('products/:id')
  @Public()
  async getProduct(@Param('id') id: string) {
    try {
      return await firstValueFrom(
        this.catalogClient.send( 'product.getById', { id }),
      );
    } catch (err) {
      mapRpcErrorToHttp(err);
    }
  }


}

