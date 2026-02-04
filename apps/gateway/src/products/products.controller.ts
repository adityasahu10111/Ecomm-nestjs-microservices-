import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import type { UserContext } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { mapRpcErrorToHttp } from '@app/rpc';
import { firstValueFrom, Observable } from 'rxjs';
import { Public } from '../auth/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

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
     @Inject('MEDIA_CLIENT') private readonly mediaClient: ClientProxy,
  ) {}

  @Post('products')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fieldSize: 5 * 1024 * 1024,
      },
    }),
  )
  async createProduct(
    @CurrentUser() user: UserContext,
    @UploadedFile() file: Express.Multer.File | undefined,

    @Body()
    body: {
      name: string;
      description: string;
      price: number;
      status?: string;
      imageUrl?: string;
    },
  ) {

// do the basic validation -> just for practice

    let imageUrl: string | undefined = undefined;
    let mediaId: string | undefined = undefined;

    if (file) {
      const base64 = file.buffer.toString('base64');

      try {
        const uploadResult = await firstValueFrom(
          this.mediaClient.send('media.uploadProductImage', {
            fileName: file.originalname,
            mimeType: file.mimetype,
            base64,
            uploadByUserId: user.clerkUserId,
          }),
        );

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        imageUrl = uploadResult.url;
        mediaId = uploadResult.mediaId;
      } catch (error) {
        mapRpcErrorToHttp(error);
      }
    }

    let product: Product;

    const payload = {
      name: body.name,
      description: body.description,
      price: Number(body.price),
      status: body.status,
      imageUrl,
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

      if (mediaId) {
      try {
        await firstValueFrom(
          this.mediaClient.send('media.attachToProduct', {
            mediaId,
            productId: String(product._id),
            attachedByUserId: user.clerkUserId,
          }),
        );
      } catch (err) {
        mapRpcErrorToHttp(err);
      }
    }
    return product;
  }

  @Get('products')
  @Public()
  async listProducts() {
    try {
      const products = await firstValueFrom(
        this.catalogClient.send('product.list', {}),
      );
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
        this.catalogClient.send('product.getById', { id }),
      );
    } catch (err) {
      mapRpcErrorToHttp(err);
    }
  }
}
