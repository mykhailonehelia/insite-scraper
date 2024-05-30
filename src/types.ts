import { Client as MinioClient } from "minio";

import { z } from "zod";

export const Message = z.object({
  service: z.string(),
  req: z.string(),
  data: z.any(),
});

export type Message = z.infer<typeof Message>;

export const newSiteRequestData = z.object({
  url: z.string(),
  callback: z.string(),
});

export const fetchHtmlRequest = z.object({
  url: z.string(),
});

export const fetchHtmlResponse = z.object({
  url: z.string(),
  key: z.string(),
});

export type Services = {
  minio: MinioClient;
  inscriptis: {
    endpoint: string;
  },
  scrapingbee: {
    apiKey: string;
  },
  lighthouse: {
    apiKey: string;
  }
};

export const Progress = z.object({
  urls: z.record(z.string(), z.boolean()),
  callback: z.string(),
  lighthouse: z.boolean(),
  allText: z.boolean(),
  structuredData: z.boolean(),
});

export type Progress = z.infer<typeof Progress>;

export const CompanyInfoStructuredData = z.object({
  companyName: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  street: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zip: z.string().nullable(),
});

export const ReviewsStructuredData = z.object({
  reviews: z
    .object({
      reviewerName: z.string().nullable(),
      rating: z.number().nullable(),
      content: z.string(),
    })
    .array(),
});

export const ServicesStructuredData = z.object({
  services: z
    .object({
      name: z.string(),
      description: z.string(),
      faIcon: z.string().startsWith("fa-"),
    })
    .array(),
});


const SiteSchema = z.object({
  url: z.string().url(),
  companyName: z.string(),
});

export const RequestSchema = z.object({
  sites: z.array(SiteSchema),
  callback: z.string().url(),
});

export const SocialMediaLinkSchema = z.object({
  socialMediaLinks: z
    .object({
      platform: z.string(),
      url: z.string().url(),
    })
    .array(),
});