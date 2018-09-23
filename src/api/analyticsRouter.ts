import { Router } from 'express';
import jsonfile = require('jsonfile');
import { GetAnalyticsRequest } from './request';
import { AggregateData, DayData } from './data';

const addDayData = (x: DayData, y: DayData): DayData => {
  const newDayData = x;
  for (const [key, value] of Object.entries(x)) {
    newDayData[key] += y[key];
  }

  return newDayData;
};

const divideAndFloorDayData = (x: DayData, divideBy: number): DayData => {
  const newX = x;
  for (const [key, value] of Object.entries(newX)) {
    newX[key] = Math.floor(newX[key] / divideBy);
  }
  return newX;
};

const router = Router();

const isLatLngInBounds = (lat: number, lng: number, x: AggregateData) =>
  lat < x.max_lat && lat > x.min_lat && lng < x.max_lon && lng > x.min_lon;

router.get('/', async (req: GetAnalyticsRequest, res) => {
  const file = `${__dirname}/data/sample_data.json`;
  const { lat, lng } = req.headers;
  try {
    const data: AggregateData[] = ((await jsonfile.readFile(
      file,
    )) as any) as AggregateData[];

    const intermediateData = data.filter((x) => isLatLngInBounds(lat, lng, x));

    if (!intermediateData) {
      res.send({
        hasErrors: false,
        payload: {
          result: [],
        },
        errors: [],
      });
      return;
    }

    const addedData = intermediateData.reduce((accumulator, currentValue) => {
      if (!accumulator) {
        return currentValue;
      }
      const newX = accumulator!;
      for (const [key, value] of Object.entries(newX)) {
        newX[key] = addDayData(accumulator![key], currentValue[key]);
      }
      return newX;
    }, undefined);

    const averageData = addedData;
    if (averageData) {
      for (const [key, value] of Object.entries(averageData)) {
        averageData[key] = divideAndFloorDayData(
          averageData[key],
          intermediateData.length,
        );
      }
    }

    res.send({
      hasErrors: false,
      payload: {
        result: averageData,
      },
      errors: [],
    });
  } catch (err) {
    console.error(err);
  }
});

export default router;