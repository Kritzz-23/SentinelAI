import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { createProxyMiddleware } from 'http-proxy-middleware';

@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(createProxyMiddleware({ target: process.env.BACKEND_URL || 'http://backend:8000', changeOrigin: true, ws: true, pathRewrite: {'^/api': '/api'} })).forRoutes('api');
  }
}
