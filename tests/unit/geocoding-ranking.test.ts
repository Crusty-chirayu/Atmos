import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateLocationScore,
  deduplicateGeocodingResults,
  normalizeSearchString,
  rankGeocodingResults,
} from "@/lib/geocoding/ranking/ranking";
import { GeocodingLocation } from "@/lib/geocoding/domain/types";

describe("Geocoding Ranking & Deduplication", () => {
  describe("normalizeSearchString", () => {
    it("strips diacritics and converts to lowercase", () => {
      assert.equal(normalizeSearchString("München"), "munchen");
      assert.equal(normalizeSearchString("Montréal"), "montreal");
      assert.equal(normalizeSearchString("São Paulo"), "sao paulo");
      assert.equal(normalizeSearchString("  København  "), "kobenhavn");
    });
  });

  describe("calculateLocationScore", () => {
    const baseLocation: GeocodingLocation = {
      id: "test:1",
      providerId: "test",
      name: "Paris",
      country: "France",
      countryCode: "FR",
      adminArea: "Île-de-France",
      latitude: 48.85,
      longitude: 2.35,
      formattedAddress: "Paris, France",
    };

    it("gives highest score to exact name match", () => {
      const exactScore = calculateLocationScore(baseLocation, "Paris");
      const prefixScore = calculateLocationScore(
        { ...baseLocation, name: "Parisville" },
        "Paris"
      );
      const substringScore = calculateLocationScore(
        { ...baseLocation, name: "South Paris" },
        "Paris"
      );

      assert.ok(exactScore > prefixScore);
      assert.ok(prefixScore > substringScore);
    });

    it("awards bonus score for capital city feature code (PPLC)", () => {
      const capital = { ...baseLocation, featureCode: "PPLC" };
      const nonCapital = { ...baseLocation, featureCode: "PPL" };

      const scoreCap = calculateLocationScore(capital, "Paris");
      const scoreNonCap = calculateLocationScore(nonCapital, "Paris");

      assert.ok(scoreCap > scoreNonCap);
    });

    it("boosts score proportionally with population", () => {
      const megaCity = { ...baseLocation, population: 10000000 };
      const smallTown = { ...baseLocation, population: 5000 };

      const scoreMega = calculateLocationScore(megaCity, "Paris");
      const scoreTown = calculateLocationScore(smallTown, "Paris");

      assert.ok(scoreMega > scoreTown);
    });
  });

  describe("rankGeocodingResults", () => {
    it("places exact matches before partial matches", () => {
      const locations: GeocodingLocation[] = [
        {
          id: "1",
          providerId: "test",
          name: "Londontown",
          latitude: 10,
          longitude: 10,
          formattedAddress: "Londontown",
        },
        {
          id: "2",
          providerId: "test",
          name: "London",
          latitude: 51.5,
          longitude: -0.12,
          population: 9000000,
          formattedAddress: "London, UK",
        },
        {
          id: "3",
          providerId: "test",
          name: "East London",
          latitude: -33,
          longitude: 27,
          formattedAddress: "East London, SA",
        },
      ];

      const ranked = rankGeocodingResults(locations, "London");
      assert.equal(ranked[0].name, "London");
      assert.equal(ranked[1].name, "Londontown");
      assert.equal(ranked[2].name, "East London");
    });

    it("sorts by population descending when names match equally", () => {
      const locations: GeocodingLocation[] = [
        {
          id: "london-ca",
          providerId: "test",
          name: "London",
          adminArea: "Ontario",
          country: "Canada",
          population: 346000,
          latitude: 42.98,
          longitude: -81.23,
          formattedAddress: "London, Ontario, Canada",
        },
        {
          id: "london-uk",
          providerId: "test",
          name: "London",
          country: "United Kingdom",
          population: 8960000,
          latitude: 51.51,
          longitude: -0.12,
          formattedAddress: "London, United Kingdom",
        },
      ];

      const ranked = rankGeocodingResults(locations, "London");
      assert.equal(ranked[0].id, "london-uk");
      assert.equal(ranked[1].id, "london-ca");
    });
  });

  describe("deduplicateGeocodingResults", () => {
    it("removes duplicate results mapping to the same normalized coordinates and name", () => {
      const locations: GeocodingLocation[] = [
        {
          id: "1",
          providerId: "test",
          name: "Rome",
          latitude: 41.8931,
          longitude: 12.4832,
          formattedAddress: "Rome, Italy",
        },
        {
          id: "2",
          providerId: "test",
          name: "Rome",
          latitude: 41.8945, // Rounds to same 41.89
          longitude: 12.4821, // Rounds to same 12.48
          formattedAddress: "Rome, Lazio, Italy",
        },
        {
          id: "3",
          providerId: "test",
          name: "Rome",
          latitude: 34.257, // Rome, Georgia, USA (different coordinates)
          longitude: -85.164,
          formattedAddress: "Rome, Georgia, USA",
        },
      ];

      const deduped = deduplicateGeocodingResults(locations);
      assert.equal(deduped.length, 2);
      assert.equal(deduped[0].id, "1");
      assert.equal(deduped[1].id, "3");
    });
  });
});
